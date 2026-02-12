import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getWorklogs } from '../api/client'
import { KpiBar, DataTable, Column } from '../components/common'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface DashboardProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  selectedInstance: string | null
}

interface WorklogData {
  total_hours: number
  expected_hours: number
  completion_percentage: number
  teams: any[]
  top_epics: any[]
  daily_trend: any[]
  worklog_count?: number
  active_users?: number
  billable_ratio?: number
}

export default function NewDashboard({ dateRange, selectedInstance }: DashboardProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<WorklogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentWorklogs, setRecentWorklogs] = useState<any[]>([])

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

  // Calculate KPIs
  const kpiItems = [
    {
      label: 'Total Worklogs',
      value: data.worklog_count || 0,
    },
    {
      label: 'Hours Tracked',
      value: `${data.total_hours.toFixed(1)}h`,
      trend: data.completion_percentage >= 100 ? 5 : undefined,
      trendDirection: data.completion_percentage >= 100 ? ('up' as const) : undefined,
    },
    {
      label: 'Active Users',
      value: data.active_users || data.teams.reduce((sum, t) => sum + t.member_count, 0),
    },
    {
      label: 'Completion',
      value: `${Math.round(data.completion_percentage)}%`,
      trend:
        data.completion_percentage >= 90
          ? 10
          : data.completion_percentage >= 70
          ? 5
          : undefined,
      trendDirection:
        data.completion_percentage >= 70 ? ('up' as const) : ('down' as const),
    },
  ]

  // Prepare daily trend data
  const dailyTrendData = data.daily_trend.map((item) => ({
    date: format(new Date(item.date), 'd MMM', { locale: it }),
    hours: item.hours || 0,
  }))

  // Prepare projects data (top 5)
  const projectsData = data.top_epics
    .slice(0, 5)
    .map((epic) => ({
      name: epic.epic_name.length > 20 ? epic.epic_name.substring(0, 20) + '...' : epic.epic_name,
      hours: epic.total_hours,
      full_name: epic.epic_name,
    }))
    .sort((a, b) => b.hours - a.hours)

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
    },
    {
      key: 'author',
      label: 'Author',
      type: 'text',
      width: '150px',
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
    duration: `${(wl.duration / 3600).toFixed(1)}h`,
    date: format(new Date(wl.date), 'MMM d', { locale: it }),
  }))

  return (
    <div className="space-y-6 max-w-[1920px]">
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
                  formatter={(value: any) => [`${value}h`, 'Hours']}
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
                margin={{ top: 10, right: 10, left: 80, bottom: 10 }}
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
                  tickFormatter={(value) => `${value}h`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-primary)', fontSize: 11 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value}h`,
                    props.payload.full_name,
                  ]}
                />
                <Bar
                  dataKey="hours"
                  fill="var(--color-accent)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                />
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
