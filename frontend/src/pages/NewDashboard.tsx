import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getWorklogs, getJiraInstances, getComplementaryGroups, getHolidaysForRange, getMultiJiraOverview } from '../api/client'
import { KpiBar, DataTable, Column, Card, Badge } from '../components/common'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { format, differenceInBusinessDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatHours } from '../hooks/useData'

interface DashboardProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  selectedInstance: string | null
  onDateRangeChange?: (range: { startDate: Date; endDate: Date }) => void
}

interface WorklogData {
  total_hours: number
  expected_hours: number
  completion_percentage: number
  teams: any[]
  top_epics: any[]
  top_projects?: any[]
  worklog_count?: number
  active_users?: number
  billable_ratio?: number
}

type PeriodPreset = 'this-week' | 'this-month' | 'last-month' | 'this-quarter'

const INSTANCE_COLORS: { [key: number]: string } = {
  0: 'var(--color-accent)', // #2563EB
  1: '#16A34A', // green
  2: '#D97706', // orange
  3: '#8B5CF6', // purple
  4: '#EC4899', // pink
}

export default function NewDashboard({ dateRange, selectedInstance, onDateRangeChange }: DashboardProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<WorklogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentWorklogs, setRecentWorklogs] = useState<any[]>([])
  const [allWorklogs, setAllWorklogs] = useState<any[]>([])
  const [jiraInstances, setJiraInstances] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>('this-month')
  const [complementaryGroups, setComplementaryGroups] = useState<any[]>([])
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedProjectInstance, setSelectedProjectInstance] = useState<string | null>(null)
  const [multiJiraOverview, setMultiJiraOverview] = useState<any>(null)

  const handlePeriodChange = (period: PeriodPreset) => {
    setSelectedPeriod(period)
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (period) {
      case 'this-week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // Monday
        break
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
        break
      case 'this-quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    if (onDateRangeChange) {
      onDateRangeChange({ startDate, endDate })
    }
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getDashboard(
        dateRange.startDate,
        dateRange.endDate,
        selectedInstance
      )
      setData(result)

      // Fetch JIRA instances
      const instancesResult = await getJiraInstances()
      setJiraInstances(instancesResult.instances || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, selectedInstance])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch recent worklogs and all worklogs for instance aggregation
  useEffect(() => {
    const fetchWorklogs = async () => {
      try {
        // Fetch recent worklogs (for table)
        console.log('[Dashboard] Fetching recent worklogs...', {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          selectedInstance
        })
        const recentResult = await getWorklogs({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          jiraInstance: selectedInstance || undefined,
          page: 1,
          pageSize: 10
        })
        console.log('[Dashboard] Recent worklogs fetched:', recentResult)
        setRecentWorklogs(recentResult.worklogs || [])

        // Fetch all worklogs (for instance aggregation) - only if no instance filter
        if (!selectedInstance) {
          console.log('[Dashboard] Fetching all worklogs for instance aggregation...')
          const allResult = await getWorklogs({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            page: 1,
            pageSize: 500 // Max allowed by backend
          })
          console.log('[Dashboard] All worklogs fetched:', allResult?.worklogs?.length || 0)
          setAllWorklogs(allResult.worklogs || [])
        } else {
          setAllWorklogs([])
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch worklogs:', err)
        setRecentWorklogs([])
        setAllWorklogs([])
      }
    }

    fetchWorklogs()
  }, [dateRange.startDate, dateRange.endDate, selectedInstance])

  // Fetch complementary groups, holidays, and multi-jira overview (independent calls)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const groupsResult = await getComplementaryGroups()
        setComplementaryGroups(groupsResult.groups || [])
      } catch (err) {
        console.error('[Dashboard] Failed to fetch groups:', err)
      }

      try {
        const startDate = dateRange.startDate.toISOString().split('T')[0]
        const endDate = dateRange.endDate.toISOString().split('T')[0]
        const holidaysResult = await getHolidaysForRange(startDate, endDate)
        setHolidayDates(holidaysResult.holiday_dates || [])
      } catch (err) {
        console.error('[Dashboard] Failed to fetch holidays:', err)
      }

      try {
        const overviewResult = await getMultiJiraOverview(dateRange.startDate, dateRange.endDate)
        setMultiJiraOverview(overviewResult)
      } catch (err) {
        console.error('[Dashboard] Failed to fetch multi-jira overview:', err)
      }
    }

    fetchMetadata()
  }, [dateRange.startDate, dateRange.endDate])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-surface-secondary rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-64 bg-surface-secondary rounded-lg animate-pulse" />
          <div className="h-64 bg-surface-secondary rounded-lg animate-pulse" />
        </div>
        <div className="h-96 bg-surface-secondary rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-error font-semibold mb-2">Error loading dashboard</p>
          <p className="text-secondary mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Calculate working days in period (for Avg/Day KPI) - excluding weekends and holidays
  const businessDays = differenceInBusinessDays(dateRange.endDate, dateRange.startDate)
  const weekdayHolidays = holidayDates.filter(dateStr => {
    const date = new Date(dateStr)
    const dayOfWeek = date.getDay()
    return dayOfWeek !== 0 && dayOfWeek !== 6
  })
  const workingDays = businessDays - weekdayHolidays.length
  const avgHoursPerDay = workingDays > 0 ? data.total_hours / workingDays : 0

  // Calculate KPIs
  const kpiItems = [
    {
      label: 'Worklogs',
      value: data.worklog_count || 0,
    },
    {
      label: 'Hours',
      value: formatHours(data.total_hours),
    },
    {
      label: 'Active Users',
      value: data.active_users || 0,
    },
    {
      label: 'Avg/Day',
      value: formatHours(avgHoursPerDay),
    },
  ]

  // Prepare projects data (top 5 + "Other")
  const allProjects = data.top_projects || data.top_epics || []

  // Get all configured JIRA instances for tab selector (shows all, even if no projects in current period)
  const projectInstances = jiraInstances.map((inst: any) => inst.name).filter(Boolean) as string[]

  // Auto-select first instance if none selected or current selection is invalid
  const activeProjectInstance = selectedProjectInstance && projectInstances.includes(selectedProjectInstance)
    ? selectedProjectInstance
    : projectInstances[0] || null

  // Filter projects by selected instance
  const filteredProjects = activeProjectInstance
    ? allProjects.filter((p: any) => p.jira_instance === activeProjectInstance)
    : allProjects

  const top5Projects = filteredProjects.slice(0, 5)
  const otherProjects = filteredProjects.slice(5)

  const projectsData = top5Projects.map((project: any) => ({
    name: project.epic_name.length > 25 ? project.epic_name.substring(0, 25) + '...' : project.epic_name,
    hours: project.total_hours,
    full_name: project.epic_name,
  }))

  // Add "Other" if there are more than 5 projects
  if (otherProjects.length > 0) {
    const otherHours = otherProjects.reduce((sum: number, p: any) => sum + p.total_hours, 0)
    projectsData.push({
      name: 'Other',
      hours: otherHours,
      full_name: `${otherProjects.length} other projects`,
    })
  }

  // Sort by hours descending
  projectsData.sort((a, b) => b.hours - a.hours)

  // Recent activity columns
  const recentActivityColumns: Column[] = [
    {
      key: 'issue_key',
      label: 'Issue',
      type: 'link',
      width: '120px',
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      width: '40ch',
    },
    {
      key: 'author',
      label: 'Author',
      type: 'text',
      width: '200px',
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'duration',
      width: '100px',
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      width: '100px',
    },
  ]

  // Format recent worklogs for display
  const recentActivity = recentWorklogs.map((wl) => ({
    id: wl.id,
    issue_key: wl.issue_key,
    summary: wl.summary || '',
    author: wl.author || wl.author_email || '',
    duration: formatHours(wl.duration / 3600),
    date: format(new Date(wl.date), 'd MMM', { locale: it }),
  }))

  console.log('[Dashboard] Recent activity prepared:', {
    recentWorklogsCount: recentWorklogs.length,
    recentActivityCount: recentActivity.length,
    sample: recentActivity[0]
  })

  // ============ BY INSTANCE SECTION ============

  // Build complementary group map: instance_name -> group
  const instanceToGroup = new Map()
  const groupToPrimary = new Map()
  const groupToMembers = new Map()

  complementaryGroups.forEach((group) => {
    const members = group.members || []  // Array of { id, name, url }
    const primaryInstanceName = group.primary_instance_name  // ✅ correct field
    groupToMembers.set(group.name, members)

    members.forEach((member) => {  // ✅ member is object
      instanceToGroup.set(member.name, group.name)  // ✅ access member.name
    })

    if (primaryInstanceName) {
      groupToPrimary.set(group.name, primaryInstanceName)
    }
  })

  // Aggregate worklogs by instance (keeping individual stats)
  const instanceStats = new Map()
  const instanceContributors = new Map()
  const instanceWorklogs = new Map()

  allWorklogs.forEach((wl) => {
    const instance = wl.jira_instance || 'Unknown'
    const hours = wl.duration / 3600

    if (!instanceStats.has(instance)) {
      instanceStats.set(instance, 0)
      instanceContributors.set(instance, new Set())
      instanceWorklogs.set(instance, 0)
    }

    instanceStats.set(instance, instanceStats.get(instance) + hours)
    instanceContributors.get(instance).add(wl.author_email)
    instanceWorklogs.set(instance, instanceWorklogs.get(instance) + 1)
  })

  // Group instances by complementary groups
  const processedInstances = new Set()
  const instanceData: any[] = []

  // Process complementary groups first
  complementaryGroups.forEach((group) => {
    const members = group.members || []  // Array of { id, name, url }
    const primaryInstanceName = group.primary_instance_name  // ✅ correct field

    // Check if any member has data (using member.name)
    const hasData = members.some((member) => instanceStats.has(member.name))  // ✅
    if (!hasData) return

    // Mark all members as processed (using member.name)
    members.forEach((member) => processedInstances.add(member.name))  // ✅

    // Use primary instance data (do NOT sum)
    const hours = instanceStats.get(primaryInstanceName) || 0  // ✅
    const contributors = instanceContributors.get(primaryInstanceName)?.size || 0
    const worklogCount = instanceWorklogs.get(primaryInstanceName) || 0

    // Calculate available hours (working days × 8h × contributors)
    const availableHours = workingDays * 8 * contributors
    const utilization = availableHours > 0 ? (hours / availableHours) * 100 : 0

    // Build member details for expandable rows (using member.name)
    const memberDetails = members.map((member) => ({  // ✅
      instance: member.name,  // ✅
      hours: instanceStats.get(member.name) || 0,  // ✅
      worklogCount: instanceWorklogs.get(member.name) || 0,
      contributors: instanceContributors.get(member.name)?.size || 0,
      isPrimary: member.name === primaryInstanceName,  // ✅
    }))

    instanceData.push({
      instance: group.name, // Show group name instead of instance name
      hours,
      worklogCount,
      contributors,
      availableHours,
      utilization,
      isGroup: true,
      members: memberDetails,
      groupName: group.name,
    })
  })

  // Process standalone instances (not in any group)
  Array.from(instanceStats.entries()).forEach(([instance, hours]) => {
    if (processedInstances.has(instance)) return // Skip if already in a group

    const contributors = instanceContributors.get(instance).size
    const worklogCount = instanceWorklogs.get(instance)

    // Calculate available hours (working days × 8h × contributors)
    const availableHours = workingDays * 8 * contributors
    const utilization = availableHours > 0 ? (hours / availableHours) * 100 : 0

    instanceData.push({
      instance,
      hours,
      worklogCount,
      contributors,
      availableHours,
      utilization,
      isGroup: false,
      members: [],
    })
  })

  // Sort by hours descending
  instanceData.sort((a, b) => b.hours - a.hours)

  // Diagnostic logging (can be removed after verification)
  console.log('[Dashboard] Complementary groups:', complementaryGroups)
  console.log('[Dashboard] Instance stats:', Array.from(instanceStats.entries()))
  console.log('[Dashboard] Processed instances:', Array.from(processedInstances))
  console.log('[Dashboard] Final instanceData:', instanceData)
  console.log('[Dashboard] TOTAL used:', instanceData.reduce((sum, item) => sum + item.hours, 0))

  // Prepare data for donut chart
  const donutData = instanceData.map((item, index) => ({
    name: item.instance,
    value: item.hours,
    color: INSTANCE_COLORS[index] || '#94A3B8',
  }))

  // Add "Available" segment (remaining capacity)
  const totalUsed = instanceData.reduce((sum, item) => sum + item.hours, 0)
  const totalAvailable = instanceData.reduce((sum, item) => sum + item.availableHours, 0)
  const totalRemaining = Math.max(0, totalAvailable - totalUsed)

  if (totalRemaining > 0) {
    donutData.push({
      name: 'Available',
      value: totalRemaining,
      color: '#F1F5F9',
    })
  }

  // Prepare data for team bar chart
  const teamInstanceData: any[] = []
  if (data.teams && data.teams.length > 0) {
    data.teams.forEach((team) => {
      if (team.hours_by_instance) {
        Object.entries(team.hours_by_instance).forEach(([instance, hours]: [string, any]) => {
          teamInstanceData.push({
            team: team.team_name,
            instance,
            hours: hours as number,
          })
        })
      }
    })
  }

  // Group by team for horizontal grouped bar chart
  const teamNames = Array.from(new Set(teamInstanceData.map(t => t.team)))
  const groupedTeamData = teamNames.map(team => {
    const teamData: any = { team }
    teamInstanceData.filter(t => t.team === team).forEach(t => {
      teamData[t.instance] = t.hours
    })
    return teamData
  })

  // Sort by total hours
  groupedTeamData.sort((a, b) => {
    const aTotal = Object.keys(a).filter(k => k !== 'team').reduce((sum, k) => sum + (a[k] || 0), 0)
    const bTotal = Object.keys(b).filter(k => k !== 'team').reduce((sum, k) => sum + (b[k] || 0), 0)
    return bTotal - aTotal
  })

  // Toggle expand/collapse for grouped instances
  const toggleExpand = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  // Build discrepancy lookup from multi-jira overview
  const discrepancyMap = new Map<string, { delta: number; primaryHours: number; secondaryHours: number }>()
  if (multiJiraOverview?.complementary_comparisons) {
    multiJiraOverview.complementary_comparisons.forEach((c: any) => {
      const delta = c.primary_total_hours - c.secondary_total_hours
      discrepancyMap.set(c.group_name, {
        delta,
        primaryHours: c.primary_total_hours,
        secondaryHours: c.secondary_total_hours,
      })
    })
  }

  // Prepare data for comparison table
  const comparisonTableColumns: Column[] = [
    {
      key: 'instance',
      label: 'Instance',
      type: 'text',
      width: '280px',
      render: (value, row: any) => {
        const isExpanded = expandedGroups.has(row.groupName)
        const hasMembers = row.isGroup && row.members && row.members.length > 1
        const discrepancy = row.isGroup ? discrepancyMap.get(row.groupName) : null
        const hasDiscrepancy = discrepancy && Math.abs(discrepancy.delta) > 0.5

        return (
          <div
            className={`flex items-center gap-2 ${hasMembers ? 'cursor-pointer hover:text-accent' : ''} ${row.isChild ? 'pl-6 text-secondary' : ''}`}
            onClick={() => hasMembers && toggleExpand(row.groupName)}
          >
            {hasMembers && (
              <span className="text-xs">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {row.isChild && <span className="text-xs mr-1">└</span>}
            <span className={`text-sm ${row.isChild ? '' : 'font-medium'}`}>
              {value}
              {row.isPrimary && <span className="ml-2 text-xs text-accent">(primary)</span>}
            </span>
            {hasDiscrepancy && (
              <Badge variant="warning">
                {discrepancy.delta > 0 ? '+' : ''}{formatHours(discrepancy.delta)}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'hours',
      label: 'Hours',
      type: 'text',
      width: '120px',
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'worklogs',
      label: 'Worklogs',
      type: 'number',
      width: '100px',
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'contributors',
      label: 'Contributors',
      type: 'number',
      width: '120px',
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'available',
      label: 'Available',
      type: 'text',
      width: '120px',
      render: (value) => <span className="font-mono text-xs text-secondary">{value}</span>,
    },
    {
      key: 'utilization',
      label: 'Utilization',
      type: 'text',
      width: '180px',
      render: (value, row: any) => {
        const percentage = row.utilizationValue
        const color =
          percentage < 50
            ? 'text-warning'
            : percentage >= 50 && percentage < 85
            ? 'text-primary'
            : percentage >= 85 && percentage <= 100
            ? 'text-success'
            : 'text-error'

        return (
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-medium ${color}`}>{value}</span>
            <div className="w-16 h-1 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )
      },
    },
  ]

  // Build table data with expandable rows
  const comparisonTableData: any[] = []

  instanceData.forEach((item) => {
    // Add parent row
    comparisonTableData.push({
      id: item.instance,
      instance: item.instance,
      hours: formatHours(item.hours),
      worklogs: item.worklogCount,
      contributors: item.contributors,
      available: formatHours(item.availableHours),
      utilization: `${Math.round(item.utilization)}%`,
      utilizationValue: item.utilization,
      isGroup: item.isGroup,
      groupName: item.groupName,
      members: item.members,
      isChild: false,
    })

    // Add child rows if group is expanded
    if (item.isGroup && expandedGroups.has(item.groupName)) {
      item.members.forEach((member: any) => {
        const memberAvailable = workingDays * 8 * member.contributors
        const memberUtilization = memberAvailable > 0 ? (member.hours / memberAvailable) * 100 : 0

        comparisonTableData.push({
          id: `${item.instance}-${member.instance}`,
          instance: member.instance,
          hours: formatHours(member.hours),
          worklogs: member.worklogCount,
          contributors: member.contributors,
          available: formatHours(memberAvailable),
          utilization: `${Math.round(memberUtilization)}%`,
          utilizationValue: memberUtilization,
          isGroup: false,
          isChild: true,
          isPrimary: member.isPrimary,
        })
      })
    }
  })

  // Add TOTAL row
  const totalRow = {
    id: 'total',
    instance: 'TOTAL',
    hours: formatHours(totalUsed),
    worklogs: instanceData.reduce((sum, item) => sum + item.worklogCount, 0),
    contributors: new Set(allWorklogs.map((wl: any) => wl.author_email)).size,
    available: formatHours(totalAvailable),
    utilization: totalAvailable > 0 ? `${Math.round((totalUsed / totalAvailable) * 100)}%` : '0%',
    utilizationValue: totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0,
  }
  comparisonTableData.push(totalRow)

  // Show BY INSTANCE section only if no instance filter is active
  const showInstanceSection = !selectedInstance && instanceData.length > 0

  console.log('[Dashboard] Instance section:', {
    selectedInstance,
    instanceDataLength: instanceData.length,
    showInstanceSection,
    allWorklogsCount: allWorklogs.length
  })

  return (
    <div className="space-y-6 max-w-[1920px]">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        {(['this-week', 'this-month', 'last-month', 'this-quarter'] as const).map((period) => {
          const labels = {
            'this-week': 'This Week',
            'this-month': 'This Month',
            'last-month': 'Last Month',
            'this-quarter': 'This Quarter',
          }
          const isActive = selectedPeriod === period
          return (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`h-[28px] px-3 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-accent-subtle text-accent-text'
                  : 'bg-transparent text-secondary hover:bg-surface-hover'
              }`}
            >
              {labels[period]}
            </button>
          )
        })}
      </div>

      {/* Row 1: KPI Bar */}
      <KpiBar items={kpiItems} />

      {/* Row 1.5: Multi-JIRA Overview Cards */}
      {multiJiraOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Complementary Group Cards */}
          {(multiJiraOverview.complementary_comparisons || []).map((comparison: any) => {
            const delta = comparison.primary_total_hours - comparison.secondary_total_hours
            const hasDiscrepancy = Math.abs(delta) > 0.01
            const discrepancyCount = (comparison.discrepancies || []).length

            return (
              <Card key={comparison.group_name} padding="compact">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-primary">{comparison.group_name}</span>
                  {hasDiscrepancy && (
                    <Badge variant="warning">{discrepancyCount} discrepancies</Badge>
                  )}
                  {!hasDiscrepancy && (
                    <Badge variant="success">Aligned</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-tertiary mb-1">
                      {comparison.primary_instance} <span className="text-accent">(primary)</span>
                    </p>
                    <p className="font-mono text-base font-bold text-primary">
                      {formatHours(comparison.primary_total_hours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">{comparison.secondary_instance}</p>
                    <p className="font-mono text-base font-bold text-primary">
                      {formatHours(comparison.secondary_total_hours)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-tertiary mb-1">Delta</p>
                    <p className={`font-mono text-base font-bold ${hasDiscrepancy ? 'text-warning' : 'text-success'}`}>
                      {delta > 0 ? '+' : ''}{formatHours(delta)}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}

          {/* Standalone Instance Cards */}
          {(multiJiraOverview.instances || [])
            .filter((inst: any) => {
              // Exclude instances that are part of complementary groups
              const groupInstances = new Set<string>()
              ;(multiJiraOverview.complementary_comparisons || []).forEach((c: any) => {
                groupInstances.add(c.primary_instance)
                groupInstances.add(c.secondary_instance)
              })
              return !groupInstances.has(inst.instance_name)
            })
            .map((inst: any) => (
              <Card key={inst.instance_name} padding="compact">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-primary">{inst.instance_name}</span>
                  <Badge variant="default">{inst.contributor_count} contributors</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-tertiary mb-1">Hours</p>
                    <p className="font-mono text-base font-bold text-primary">
                      {formatHours(inst.total_hours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">Completion</p>
                    <p className={`font-mono text-base font-bold ${
                      inst.completion_percentage >= 85 ? 'text-success' :
                      inst.completion_percentage >= 50 ? 'text-primary' : 'text-warning'
                    }`}>
                      {Math.round(inst.completion_percentage)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">Expected</p>
                    <p className="font-mono text-sm text-secondary">
                      {formatHours(inst.expected_hours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary mb-1">Initiatives</p>
                    <p className="font-mono text-sm text-secondary">
                      {inst.initiative_count}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* ============ BY INSTANCE SECTION ============ */}
      {showInstanceSection && (
        <>
          {/* Row 1: Charts */}
          <div className="grid grid-cols-12 gap-6">
            {/* Donut Chart - Utilization by Instance */}
            <div className="col-span-12 md:col-span-5">
              <Card padding="compact">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-primary">Utilization by Instance</h3>
                  <p className="text-xs text-secondary">Hours worked vs available capacity</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                      }}
                      formatter={(value: any, name: any) => [formatHours(value), name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Grouped Bar Chart - Hours by Team */}
            <div className="col-span-12 md:col-span-7">
              <Card padding="compact">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-primary">Hours by Team</h3>
                  <p className="text-xs text-secondary">Team distribution across instances</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={groupedTeamData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      horizontal
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                      tickFormatter={(value) => `${Math.round(value)}h`}
                    />
                    <YAxis
                      type="category"
                      dataKey="team"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-text-primary)', fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                      }}
                      formatter={(value: any) => formatHours(value)}
                    />
                    <Legend
                      verticalAlign="top"
                      height={24}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                    />
                    {instanceData.map((item, index) => (
                      <Bar
                        key={item.instance}
                        dataKey={item.instance}
                        fill={INSTANCE_COLORS[index] || '#94A3B8'}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={18}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>

          {/* Row 3: Comparison Table */}
          <DataTable
            columns={comparisonTableColumns}
            data={comparisonTableData}
            toolbar={{
              title: 'Instance Comparison',
            }}
          />
        </>
      )}

      {/* Row 2: By Project Chart */}
      <Card padding="compact">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-primary">By Project</h3>
            <p className="text-xs text-secondary">Top 5 initiatives</p>
          </div>
          {projectInstances.length > 0 && (
            <div className="flex items-center gap-1">
              {projectInstances.map((instance) => {
                const isActive = instance === activeProjectInstance
                return (
                  <button
                    key={instance}
                    onClick={() => setSelectedProjectInstance(instance)}
                    className={`h-[28px] px-3 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-accent-subtle text-accent-text'
                        : 'bg-transparent text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    {instance}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={projectsData}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              horizontal
              vertical={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
              tickFormatter={(value) => `${Math.round(value)}h`}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-primary)', fontSize: 11 }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: '6px',
                padding: '8px 12px',
              }}
              formatter={(value: any, name: any, props: any) => [
                formatHours(value),
                props.payload.full_name,
              ]}
            />
            <Bar
              dataKey="hours"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              {projectsData.map((entry, index) => {
                const colors = [
                  'var(--color-accent)',      // #2563EB - first bar
                  '#64748B',                   // slate-500
                  '#94A3B8',                   // slate-400
                  '#CBD5E1',                   // slate-300
                  '#E2E8F0',                   // slate-200
                  '#F1F5F9',                   // slate-100 - for "Other"
                ]
                return <Cell key={`cell-${index}`} fill={colors[index] || colors[colors.length - 1]} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Row 3: Recent Activity */}
      <DataTable
        columns={recentActivityColumns}
        data={recentActivity}
        toolbar={{
          title: 'Recent Worklogs',
          actions: (
            <button
              onClick={() => navigate('/app/worklogs')}
              className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
            >
              View all →
            </button>
          ),
        }}
      />
    </div>
  )
}
