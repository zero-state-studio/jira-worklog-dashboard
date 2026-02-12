import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getWorklogs, getJiraInstances } from '../api/client'
import { KpiBar, DataTable, Column, Card, Badge } from '../components/common'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
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
  daily_trend: any[]
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

  // Calculate working days in period (for Avg/Day KPI)
  const workingDays = differenceInBusinessDays(dateRange.endDate, dateRange.startDate) + 1
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

  // Prepare daily trend data
  const dailyTrendData = data.daily_trend.map((item) => ({
    date: format(new Date(item.date), 'd MMM', { locale: it }),
    hours: item.hours || 0,
  }))

  // Prepare projects data (top 5 + "Other")
  const allProjects = data.top_projects || data.top_epics || []
  const top5Projects = allProjects.slice(0, 5)
  const otherProjects = allProjects.slice(5)

  const projectsData = top5Projects.map((project) => ({
    name: project.epic_name.length > 25 ? project.epic_name.substring(0, 25) + '...' : project.epic_name,
    hours: project.total_hours,
    full_name: project.epic_name,
  }))

  // Add "Other" if there are more than 5 projects
  if (otherProjects.length > 0) {
    const otherHours = otherProjects.reduce((sum, p) => sum + p.total_hours, 0)
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

  // Aggregate worklogs by instance
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

  // Calculate utilization per instance
  const instanceData = Array.from(instanceStats.entries()).map(([instance, hours]) => {
    const contributors = instanceContributors.get(instance).size
    const worklogCount = instanceWorklogs.get(instance)

    // Calculate available hours (working days × 8h × contributors)
    const availableHours = workingDays * 8 * contributors
    const utilization = availableHours > 0 ? (hours / availableHours) * 100 : 0

    return {
      instance,
      hours,
      worklogCount,
      contributors,
      availableHours,
      utilization,
    }
  })

  // Sort by hours descending
  instanceData.sort((a, b) => b.hours - a.hours)

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

  // Prepare data for comparison table
  const comparisonTableColumns: Column[] = [
    {
      key: 'instance',
      label: 'Instance',
      type: 'text',
      width: '150px',
      render: (value) => <span className="text-sm font-medium">{value}</span>,
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

  const comparisonTableData = instanceData.map((item) => ({
    id: item.instance,
    instance: item.instance,
    hours: formatHours(item.hours),
    worklogs: item.worklogCount,
    contributors: item.contributors,
    available: formatHours(item.availableHours),
    utilization: `${Math.round(item.utilization)}%`,
    utilizationValue: item.utilization,
  }))

  // Add TOTAL row
  const totalRow = {
    id: 'total',
    instance: 'TOTAL',
    hours: formatHours(totalUsed),
    worklogs: instanceData.reduce((sum, item) => sum + item.worklogCount, 0),
    contributors: new Set(allWorklogs.map((wl: any) => wl.author_email)).size,
    available: formatHours(totalAvailable),
    utilization: `${Math.round((totalUsed / totalAvailable) * 100)}%`,
    utilizationValue: (totalUsed / totalAvailable) * 100,
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

      {/* Row 2: Charts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Hours by Day */}
        <div className="col-span-2">
          <div className="flat-card p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-primary">Hours by Day</h3>
              <p className="text-sm text-secondary">Daily tracking overview</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                  tickFormatter={(value) => `${value}h`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }}
                  itemStyle={{ color: 'var(--color-text-primary)', fontSize: 13 }}
                  formatter={(value: any) => [formatHours(value), 'Hours']}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#colorHours)"
                  dot={false}
                  activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Project */}
        <div>
          <div className="flat-card p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-primary">By Project</h3>
              <p className="text-sm text-secondary">Top 5 initiatives</p>
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
                  width={80}
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
          </div>
        </div>
      </div>

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

      {/* ============ BY INSTANCE SECTION ============ */}
      {showInstanceSection && (
        <>
          {/* Section Divider */}
          <div className="flex items-center gap-4 mt-12">
            <h2 className="text-base font-semibold text-primary whitespace-nowrap">By Instance</h2>
            <div className="flex-1 border-b border-solid" />
          </div>

          {/* Row 1: KPI Cards per Instance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {instanceData.map((item, index) => {
              const utilizationColor =
                item.utilization < 50
                  ? 'text-warning'
                  : item.utilization >= 50 && item.utilization < 85
                  ? 'text-primary'
                  : item.utilization >= 85 && item.utilization <= 100
                  ? 'text-success'
                  : 'text-error'

              return (
                <Card key={item.instance} padding="compact">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-primary">{item.instance}</span>
                    <Badge variant="default">{item.worklogCount} worklogs</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase text-tertiary mb-1">Hours</p>
                      <p className="font-mono text-base font-bold text-primary">{formatHours(item.hours)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-tertiary mb-1">Contributors</p>
                      <p className="font-mono text-base font-bold text-primary">{item.contributors}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs uppercase text-tertiary mb-1">Utilization (est.)</p>
                      <p className={`font-mono text-base font-bold ${utilizationColor}`}>
                        {Math.round(item.utilization)}%
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Row 2: Charts */}
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
    </div>
  )
}
