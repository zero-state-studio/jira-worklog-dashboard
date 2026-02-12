import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getWorklogs } from '../api/client'
import { KpiBar, DataTable, Column } from '../components/common'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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

export default function NewDashboard({ dateRange, selectedInstance, onDateRangeChange }: DashboardProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<WorklogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentWorklogs, setRecentWorklogs] = useState<any[]>([])
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, selectedInstance])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch recent worklogs for activity table
  useEffect(() => {
    const fetchRecentWorklogs = async () => {
      try {
        const result = await getWorklogs({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          jiraInstance: selectedInstance || undefined,
          page: 1,
          pageSize: 10
        })
        setRecentWorklogs(result.worklogs || [])
      } catch (err) {
        console.error('Failed to fetch recent worklogs:', err)
        setRecentWorklogs([])
      }
    }

    fetchRecentWorklogs()
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
    </div>
  )
}
