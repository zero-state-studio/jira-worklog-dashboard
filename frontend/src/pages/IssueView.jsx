import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getIssueDetail, syncIssueWorklogs } from '../api/client'
import { formatHours } from '../hooks/useData'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { KpiBar, DataTable, Badge, Card } from '../components/common'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export default function IssueView({ dateRange }) {
    const { issueKey } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState(null)
    const [syncResult, setSyncResult] = useState(null)

    const fetchData = useCallback(async () => {
        if (!issueKey) return

        try {
            setLoading(true)
            setError(null)
            const result = await getIssueDetail(issueKey, dateRange.startDate, dateRange.endDate)
            setData(result)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [issueKey, dateRange.startDate, dateRange.endDate])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSync = async () => {
        try {
            setSyncing(true)
            setSyncResult(null)
            const result = await syncIssueWorklogs(issueKey)
            setSyncResult(result)
            await fetchData()
        } catch (err) {
            setError(err.message)
        } finally {
            setSyncing(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-20 bg-surface-secondary rounded-lg animate-pulse" />
                <div className="h-96 bg-surface-secondary rounded-lg animate-pulse" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-error font-semibold mb-2">Error loading issue</p>
                    <p className="text-secondary mb-4">{error}</p>
                    <button onClick={fetchData} className="btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    if (!data) return null

    // Check if data is empty
    const isDataEmpty = data.worklogs.length === 0 && data.total_hours === 0

    if (isDataEmpty) {
        return (
            <div className="space-y-6">
                {/* Breadcrumb */}
                <div className="text-xs text-tertiary">
                    App / Issues / {issueKey}
                </div>

                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-solid hover:bg-surface-hover transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-secondary" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-secondary">{data.issue_key}</span>
                            {data.jira_instance && <Badge variant="default">{data.jira_instance}</Badge>}
                        </div>
                        <h1 className="text-xl font-semibold text-primary">{data.issue_summary || data.issue_key}</h1>
                    </div>
                </div>

                <div className="border border-solid rounded-lg bg-surface p-12 text-center">
                    <p className="text-sm text-secondary mb-4">No worklogs found for this issue in the selected period</p>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-4 py-2 bg-accent text-inverse rounded-md text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                        {syncing ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Sync from JIRA
                            </>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    // Calculate KPIs
    const avgHoursPerDay = data.daily_trend.length > 0 ? data.total_hours / data.daily_trend.length : 0

    const kpiItems = [
        {
            label: 'Hours',
            value: formatHours(data.total_hours),
        },
        {
            label: 'Contributors',
            value: data.contributors.length,
        },
        {
            label: 'Worklogs',
            value: data.worklogs.length,
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

    // Prepare contributor data (top contributors)
    const contributorData = data.contributors
        .map((c) => {
            const displayName = c.display_name || c.email || 'Unknown'
            return {
                name: displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName,
                hours: c.total_hours,
                full_name: displayName,
            }
        })
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5)

    // Prepare worklog table data
    const worklogColumns = [
        {
            key: 'date',
            label: 'Date',
            type: 'text',
            width: '180px',
            render: (value) => (
                <span className="text-xs text-secondary">
                    {format(new Date(value), 'd MMM yyyy HH:mm', { locale: it })}
                </span>
            ),
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
            type: 'text',
            width: '100px',
            render: (value) => <span className="font-mono text-xs">{value}</span>,
        },
    ]

    const worklogData = data.worklogs.slice(0, 100).map((wl) => ({
        id: wl.id,
        date: wl.started,
        author: wl.author_display_name,
        duration: formatHours(wl.time_spent_seconds / 3600),
        author_user_id: wl.author_user_id,
    }))

    return (
        <div className="space-y-6 max-w-[1920px]">
            {/* Breadcrumb */}
            <div className="text-xs text-tertiary">
                App / Issues / {issueKey}
            </div>

            {/* Header */}
            <div className="flex items-start gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-solid hover:bg-surface-hover transition-colors flex-shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 text-secondary" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-secondary">{data.issue_key}</span>
                        {data.jira_instance && <Badge variant="default">{data.jira_instance}</Badge>}
                    </div>
                    <h1 className="text-xl font-semibold text-primary mb-2">{data.issue_summary || data.issue_key}</h1>
                    {/* Parent/Epic info */}
                    {(data.parent_key || data.epic_key) && (
                        <div className="flex items-center gap-3 text-xs text-secondary">
                            {data.parent_key && (
                                <span>
                                    Parent: <span className="font-mono text-primary">{data.parent_key}</span>
                                    {data.parent_name && (
                                        <span className="ml-1" title={data.parent_name}>
                                            · {data.parent_name.length > 40 ? data.parent_name.substring(0, 40) + '...' : data.parent_name}
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-3 py-2 border border-solid rounded-md text-xs font-medium hover:bg-surface-hover transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                >
                    {syncing ? (
                        <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Syncing...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-3 h-3" />
                            Sync
                        </>
                    )}
                </button>
            </div>

            {/* Sync result notification */}
            {syncResult && (
                <div className="px-4 py-3 bg-success-subtle border border-success rounded-md">
                    <p className="text-success text-xs">{syncResult.message}</p>
                </div>
            )}

            {/* KPI Bar */}
            <KpiBar items={kpiItems} />

            {/* Charts */}
            {data.daily_trend.length > 0 && (
                <div className="grid grid-cols-5 gap-6">
                    {/* Daily Trend (60% - 3 columns) */}
                    <div className="col-span-3">
                        <Card padding="compact">
                            <div className="mb-4">
                                <h3 className="text-base font-semibold text-primary">Daily Trend</h3>
                                <p className="text-xs text-secondary">Hours logged per day</p>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
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
                                        tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                                        dy={5}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                                        tickFormatter={(value) => `${Math.round(value)}h`}
                                        dx={-5}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border-strong)',
                                            borderRadius: '6px',
                                            padding: '6px 10px',
                                        }}
                                        labelStyle={{ color: 'var(--color-text-secondary)', fontSize: 11 }}
                                        itemStyle={{ color: 'var(--color-text-primary)', fontSize: 12 }}
                                        formatter={(value) => [formatHours(value), 'Hours']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="var(--color-accent)"
                                        strokeWidth={2}
                                        fill="url(#colorHours)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* By Contributor (40% - 2 columns) */}
                    <div className="col-span-2">
                        <Card padding="compact">
                            <div className="mb-4">
                                <h3 className="text-base font-semibold text-primary">By Contributor</h3>
                                <p className="text-xs text-secondary">Top contributors</p>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    data={contributorData}
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
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-text-primary)', fontSize: 10 }}
                                        width={90}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border-strong)',
                                            borderRadius: '6px',
                                            padding: '6px 10px',
                                        }}
                                        formatter={(value, name, props) => [
                                            formatHours(value),
                                            props.payload.full_name,
                                        ]}
                                    />
                                    <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                        {contributorData.map((entry, index) => {
                                            const colors = ['var(--color-accent)', '#16A34A', '#64748B', '#94A3B8', '#CBD5E1']
                                            return <Cell key={`cell-${index}`} fill={colors[index] || colors[colors.length - 1]} />
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                </div>
            )}

            {/* Worklogs Table */}
            <DataTable
                columns={worklogColumns}
                data={worklogData}
                toolbar={{
                    title: 'Worklogs',
                    actions: data.worklogs.length > 100 && (
                        <span className="text-xs text-tertiary">
                            Showing 100 of {data.worklogs.length}
                        </span>
                    ),
                }}
            />
        </div>
    )
}
