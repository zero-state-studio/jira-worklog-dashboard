import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getDashboard,
  getWorklogs,
  getJiraInstances,
  getComplementaryGroups,
  getHolidaysForRange,
  getMultiJiraOverview,
} from '../api/client'
import { Card, DateRangePicker } from '../components/common'
import { InstanceOverviewTable, DiscrepancyPanel } from '../components/dashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { differenceInBusinessDays } from 'date-fns'
import { formatHours } from '../hooks/useData'

interface DashboardProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  selectedInstance: string | null
  onDateRangeChange?: (range: { startDate: Date; endDate: Date }) => void
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
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jiraInstances, setJiraInstances] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>('this-month')
  const [complementaryGroups, setComplementaryGroups] = useState<any[]>([])
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [selectedProjectInstance, setSelectedProjectInstance] = useState<string | null>(null)
  const [multiJiraOverview, setMultiJiraOverview] = useState<any>(null)
  const [instanceProjects, setInstanceProjects] = useState<{ [key: string]: any[] }>({})
  const [dailyWorkingHours, setDailyWorkingHours] = useState(8)
  const [discrepancyWorklogs, setDiscrepancyWorklogs] = useState<any[]>([])

  const handlePeriodChange = (period: PeriodPreset) => {
    setSelectedPeriod(period)
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (period) {
      case 'this-week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
        break
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
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
      const result = await getDashboard(dateRange.startDate, dateRange.endDate, selectedInstance)
      setData(result)

      if (result.daily_working_hours) {
        setDailyWorkingHours(result.daily_working_hours)
      }

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

  // Fetch complementary groups, holidays, and multi-jira overview
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

  // Fetch worklogs for discrepancy analysis
  useEffect(() => {
    const fetchDiscrepancyWorklogs = async () => {
      if (!multiJiraOverview?.complementary_comparisons) return

      try {
        const allResult = await getWorklogs({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          page: 1,
          pageSize: 500,
        })
        setDiscrepancyWorklogs(allResult.worklogs || [])
      } catch (err) {
        console.error('[Dashboard] Failed to fetch discrepancy worklogs:', err)
        setDiscrepancyWorklogs([])
      }
    }

    fetchDiscrepancyWorklogs()
  }, [dateRange.startDate, dateRange.endDate, multiJiraOverview])

  // Fetch projects for selected instance
  useEffect(() => {
    const fetchInstanceProjects = async () => {
      if (!selectedProjectInstance) return
      if (instanceProjects[selectedProjectInstance]) return

      try {
        const result = await getDashboard(dateRange.startDate, dateRange.endDate, selectedProjectInstance)
        setInstanceProjects((prev) => ({
          ...prev,
          [selectedProjectInstance]: result.top_projects || [],
        }))
      } catch (err) {
        console.error(`[Dashboard] Failed to fetch projects for ${selectedProjectInstance}:`, err)
      }
    }

    fetchInstanceProjects()
  }, [selectedProjectInstance, dateRange.startDate, dateRange.endDate])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-surface-secondary rounded-lg animate-pulse" />
        <div className="h-96 bg-surface-secondary rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-surface-secondary rounded-lg animate-pulse" />
          <div className="h-64 bg-surface-secondary rounded-lg animate-pulse" />
        </div>
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

  // Calculate working days
  const businessDays = differenceInBusinessDays(dateRange.endDate, dateRange.startDate)
  const weekdayHolidays = holidayDates.filter((dateStr) => {
    const date = new Date(dateStr)
    const dayOfWeek = date.getDay()
    return dayOfWeek !== 0 && dayOfWeek !== 6
  })
  const workingDays = businessDays - weekdayHolidays.length

  // Build instance overview data from multiJiraOverview
  const instanceOverviewData: any[] = []

  if (multiJiraOverview) {
    // Process complementary groups
    if (multiJiraOverview.complementary_comparisons) {
      multiJiraOverview.complementary_comparisons.forEach((comp: any) => {
        const delta = comp.primary_total_hours - comp.secondary_total_hours
        const discrepancyCount = comp.discrepancies?.length || 0

        // Find primary and secondary instances from instances array
        const primaryInst = multiJiraOverview.instances?.find(
          (i: any) => i.instance_name === comp.primary_instance
        )
        const secondaryInst = multiJiraOverview.instances?.find(
          (i: any) => i.instance_name === comp.secondary_instance
        )

        instanceOverviewData.push({
          instance: comp.group_name,
          hours: comp.primary_total_hours,
          worklogCount: primaryInst?.worklog_count || 0,
          contributors: primaryInst?.contributor_count || 0,
          availableHours: primaryInst?.expected_hours || 0,
          utilization: primaryInst?.completion_percentage || 0,
          isGroup: true,
          groupName: comp.group_name,
          discrepancyCount,
          delta,
          members: [
            {
              instance: comp.primary_instance,
              hours: comp.primary_total_hours,
              worklogCount: primaryInst?.worklog_count || 0,
              contributors: primaryInst?.contributor_count || 0,
              availableHours: primaryInst?.expected_hours || 0,
              utilization: primaryInst?.completion_percentage || 0,
              isPrimary: true,
            },
            {
              instance: comp.secondary_instance,
              hours: comp.secondary_total_hours,
              worklogCount: secondaryInst?.worklog_count || 0,
              contributors: secondaryInst?.contributor_count || 0,
              availableHours: secondaryInst?.expected_hours || 0,
              utilization: secondaryInst?.completion_percentage || 0,
              isPrimary: false,
            },
          ],
        })
      })
    }

    // Process standalone instances
    if (multiJiraOverview.instances) {
      const groupedInstances = new Set<string>()
      multiJiraOverview.complementary_comparisons?.forEach((c: any) => {
        groupedInstances.add(c.primary_instance)
        groupedInstances.add(c.secondary_instance)
      })

      multiJiraOverview.instances
        .filter((inst: any) => !groupedInstances.has(inst.instance_name))
        .forEach((inst: any) => {
          instanceOverviewData.push({
            instance: inst.instance_name,
            hours: inst.total_hours,
            worklogCount: inst.worklog_count || 0,
            contributors: inst.contributor_count || 0,
            availableHours: inst.expected_hours || 0,
            utilization: inst.completion_percentage || 0,
            isGroup: false,
          })
        })
    }
  }

  // Build discrepancy panel data
  const discrepancyPanelData: any[] = []
  if (multiJiraOverview?.complementary_comparisons && discrepancyWorklogs.length > 0) {
    multiJiraOverview.complementary_comparisons.forEach((comp: any) => {
      const delta = comp.primary_total_hours - comp.secondary_total_hours
      if (Math.abs(delta) < 0.5) return // Skip if aligned

      // Find worklogs unique to each instance
      const primaryWorklogs = discrepancyWorklogs.filter(
        (w) => w.jira_instance === comp.primary_instance
      )
      const secondaryWorklogs = discrepancyWorklogs.filter(
        (w) => w.jira_instance === comp.secondary_instance
      )

      // Find unique issues (simplified - in real implementation, would need better matching)
      const primaryIssueKeys = new Set(primaryWorklogs.map((w) => w.issue_key))
      const secondaryIssueKeys = new Set(secondaryWorklogs.map((w) => w.issue_key))

      const primaryOnly = primaryWorklogs.filter((w) => !secondaryIssueKeys.has(w.issue_key))
      const secondaryOnly = secondaryWorklogs.filter((w) => !primaryIssueKeys.has(w.issue_key))

      discrepancyPanelData.push({
        groupName: comp.group_name,
        primaryInstance: comp.primary_instance,
        secondaryInstance: comp.secondary_instance,
        primaryHours: comp.primary_total_hours,
        secondaryHours: comp.secondary_total_hours,
        delta,
        discrepancyCount: comp.discrepancies?.length || 0,
        primaryOnlyWorklogs: primaryOnly.slice(0, 10),
        secondaryOnlyWorklogs: secondaryOnly.slice(0, 10),
      })
    })
  }

  // Prepare projects data
  const allProjects = data.top_projects || data.top_epics || []
  const projectInstances = jiraInstances.map((inst: any) => inst.name).filter(Boolean) as string[]
  const activeProjectInstance =
    selectedProjectInstance && projectInstances.includes(selectedProjectInstance)
      ? selectedProjectInstance
      : projectInstances[0] || null

  const filteredProjects = activeProjectInstance
    ? instanceProjects[activeProjectInstance] ||
      allProjects.filter((p: any) => p.jira_instance === activeProjectInstance)
    : allProjects

  const top5Projects = filteredProjects.slice(0, 5)
  const otherProjects = filteredProjects.slice(5)

  const projectsData = top5Projects.map((project: any) => ({
    name:
      project.epic_name.length > 25 ? project.epic_name.substring(0, 25) + '...' : project.epic_name,
    hours: project.total_hours,
    full_name: project.epic_name,
  }))

  if (otherProjects.length > 0) {
    const otherHours = otherProjects.reduce((sum: number, p: any) => sum + p.total_hours, 0)
    projectsData.push({
      name: 'Other',
      hours: otherHours,
      full_name: `${otherProjects.length} other projects`,
    })
  }

  projectsData.sort((a, b) => b.hours - a.hours)

  // Prepare team chart data (grouped by instance)
  const teamInstanceData: any[] = []
  if (data.teams && data.teams.length > 0) {
    data.teams.forEach((team) => {
      if (team.hours_by_instance) {
        const teamRow: any = { team: team.team_name }
        Object.entries(team.hours_by_instance).forEach(([instance, hours]: [string, any]) => {
          teamRow[instance] = hours as number
        })
        teamInstanceData.push(teamRow)
      }
    })
  }

  // Sort by total hours
  teamInstanceData.sort((a, b) => {
    const aTotal = Object.keys(a)
      .filter((k) => k !== 'team')
      .reduce((sum, k) => sum + (a[k] || 0), 0)
    const bTotal = Object.keys(b)
      .filter((k) => k !== 'team')
      .reduce((sum, k) => sum + (b[k] || 0), 0)
    return bTotal - aTotal
  })

  const showInstanceSection = !selectedInstance && instanceOverviewData.length > 0

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

        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          isActive={selectedPeriod === null}
          onChange={(range) => {
            setSelectedPeriod(null)
            if (onDateRangeChange) {
              onDateRangeChange(range)
            }
          }}
        />
      </div>

      {/* HERO SECTION: Instance Overview Table */}
      {showInstanceSection && instanceOverviewData.length > 0 && (
        <InstanceOverviewTable
          instances={instanceOverviewData}
          onDiscrepancyClick={(groupName) => {
            // Scroll to discrepancy panel
            const element = document.getElementById(`discrepancy-${groupName}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        />
      )}

      {/* DISCREPANCY PANEL */}
      {discrepancyPanelData.length > 0 && (
        <div id="discrepancy-panel">
          <DiscrepancyPanel discrepancies={discrepancyPanelData} dateRange={dateRange} />
        </div>
      )}

      {/* TEAM & PROJECT CHARTS (2-column) */}
      {showInstanceSection && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours by Team (Grouped Bar Chart) */}
          <Card padding="compact">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-primary">Hours by Team</h3>
              <p className="text-xs text-tertiary">Team distribution across instances</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={teamInstanceData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                barGap={2}
                barCategoryGap="15%"
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
                  width={100}
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
                {jiraInstances.map((inst, index) => (
                  <Bar
                    key={inst.name}
                    dataKey={inst.name}
                    fill={INSTANCE_COLORS[index] || '#94A3B8'}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={14}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Hours by Project */}
          <Card padding="compact">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-primary">Hours by Project</h3>
                <p className="text-xs text-tertiary">Top 5 initiatives</p>
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
            <ResponsiveContainer width="100%" height={280}>
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
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
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
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {projectsData.map((entry, index) => {
                    const colors = [
                      'var(--color-accent)',
                      '#64748B',
                      '#94A3B8',
                      '#CBD5E1',
                      '#E2E8F0',
                      '#F1F5F9',
                    ]
                    return <Cell key={`cell-${index}`} fill={colors[index] || colors[colors.length - 1]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}
