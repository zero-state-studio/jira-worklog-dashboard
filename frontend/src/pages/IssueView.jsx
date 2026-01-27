import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getIssueDetail, syncIssueWorklogs } from '../api/client'
import { formatHours } from '../hooks/useData'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { UserCard, StatCard, ErrorState, CardSkeleton } from '../components/Cards'
import { TrendChart, ComparisonBarChart, ChartCard } from '../components/Charts'

const RefreshIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
)

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
            // Refresh data after sync
            await fetchData()
        } catch (err) {
            setError(err.message)
        } finally {
            setSyncing(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="glass-card p-6">
                    <div className="loading-shimmer h-8 w-1/3 rounded mb-2" />
                    <div className="loading-shimmer h-4 w-1/4 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardSkeleton count={4} />
                </div>
            </div>
        )
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchData} />
    }

    if (!data) return null

    // Get badge class for parent type
    const getParentBadgeClass = (type) => {
        switch (type) {
            case 'Epic': return 'badge-purple'
            case 'Story': return 'px-2 py-1 text-xs font-medium rounded-full bg-accent-blue/20 text-accent-blue'
            case 'Task': return 'px-2 py-1 text-xs font-medium rounded-full bg-accent-green/20 text-accent-green'
            case 'Sub-task': return 'px-2 py-1 text-xs font-medium rounded-full bg-accent-orange/20 text-accent-orange'
            case 'Project': return 'px-2 py-1 text-xs font-medium rounded-full bg-dark-600 text-dark-300'
            default: return 'px-2 py-1 text-xs font-medium rounded-full bg-dark-600 text-dark-300'
        }
    }

    // Transform contributor data for bar chart
    const contributorChartData = data.contributors.map(c => {
        const displayName = c.display_name || c.email || 'Unknown'
        return {
            name: displayName.includes('@') ? displayName.split('@')[0] : displayName.split(' ')[0],
            total_hours: c.total_hours,
            full_name: displayName,
        }
    })

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                    >
                        <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-cyan-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-accent-blue/20 text-accent-blue">
                                {data.issue_key}
                            </span>
                            <span className="text-xs text-dark-500">{data.jira_instance}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-dark-100">{data.issue_summary || data.issue_key}</h1>

                        {/* Parent/Epic info */}
                        <div className="flex items-center gap-4 mt-2">
                            {data.parent_key && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-dark-500">Parent:</span>
                                    <span className={getParentBadgeClass(data.parent_type)}>{data.parent_key}</span>
                                    {data.parent_name && (
                                        <span className="text-xs text-dark-400 truncate max-w-[200px]" title={data.parent_name}>
                                            {data.parent_name}
                                        </span>
                                    )}
                                </div>
                            )}
                            {data.epic_key && data.epic_key !== data.parent_key && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-dark-500">Epic:</span>
                                    <button
                                        onClick={() => navigate(`/epics/${encodeURIComponent(data.epic_key)}`)}
                                        className="badge-purple hover:opacity-80"
                                    >
                                        {data.epic_key}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                            {formatHours(data.total_hours)}
                        </p>
                        <p className="text-dark-400 text-sm">{data.contributors.length} contributori</p>
                    </div>
                </div>
            </div>

            {/* Sync Button & Result */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-dark-100">Sincronizza da JIRA</h3>
                        <p className="text-sm text-dark-400">Aggiorna i worklog di questa issue direttamente da JIRA</p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-colors disabled:opacity-50"
                    >
                        {syncing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Sincronizzazione...
                            </>
                        ) : (
                            <>
                                <RefreshIcon />
                                Sincronizza Issue
                            </>
                        )}
                    </button>
                </div>

                {syncResult && (
                    <div className="mt-4 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
                        <p className="text-accent-green text-sm">
                            {syncResult.message}
                        </p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Ore Totali"
                    value={formatHours(data.total_hours)}
                    color="primary"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Contributori"
                    value={data.contributors.length}
                    color="blue"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Worklog"
                    value={data.worklogs.length}
                    color="green"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    }
                />
            </div>

            {/* Charts */}
            {data.daily_trend.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Trend Giornaliero" subtitle="Ore registrate sulla issue">
                        <TrendChart data={data.daily_trend} height={280} />
                    </ChartCard>

                    {data.contributors.length > 0 && (
                        <ChartCard title="Contributi per Persona" subtitle="Chi ha lavorato sulla issue">
                            <ComparisonBarChart
                                data={contributorChartData}
                                dataKey="total_hours"
                                nameKey="name"
                                height={Math.max(data.contributors.length * 50 + 50, 200)}
                                horizontal
                            />
                        </ChartCard>
                    )}
                </div>
            )}

            {/* Contributors */}
            {data.contributors.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Contributori</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.contributors.map((contributor) => (
                            <UserCard
                                key={contributor.email}
                                name={contributor.display_name}
                                email={contributor.email}
                                hours={contributor.total_hours}
                                onClick={() => navigate(`/users/${encodeURIComponent(contributor.email)}`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Worklog Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-dark-700">
                    <h2 className="font-semibold text-dark-100">Dettaglio Worklog</h2>
                    <p className="text-sm text-dark-400">{data.worklogs.length} registrazioni nel periodo</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-dark-700/50">
                            <tr>
                                <th className="table-header">Data</th>
                                <th className="table-header">Autore</th>
                                <th className="table-header text-right">Ore</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.worklogs.slice(0, 100).map((wl) => (
                                <tr key={wl.id} className="hover:bg-dark-700/30 transition-colors">
                                    <td className="table-cell whitespace-nowrap">
                                        {format(new Date(wl.started), 'd MMM yyyy HH:mm', { locale: it })}
                                    </td>
                                    <td className="table-cell">
                                        <button
                                            onClick={() => navigate(`/users/${encodeURIComponent(wl.author_email)}`)}
                                            className="text-accent-blue hover:underline"
                                        >
                                            {wl.author_display_name}
                                        </button>
                                    </td>
                                    <td className="table-cell text-right font-medium">
                                        {formatHours(wl.time_spent_seconds / 3600)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.worklogs.length > 100 && (
                        <div className="p-4 text-center text-dark-400 text-sm border-t border-dark-700">
                            Mostrati 100 di {data.worklogs.length} worklog
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
