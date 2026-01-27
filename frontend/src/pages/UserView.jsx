import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetail } from '../api/client'
import { formatHours } from '../hooks/useData'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { StatCard, ProgressBar, EpicCard, ErrorState } from '../components/Cards'
import { TrendChart, DistributionChart, ChartCard } from '../components/Charts'

export default function UserView({ dateRange, selectedInstance }) {
    const { email } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getUserDetail(email, dateRange.startDate, dateRange.endDate, selectedInstance)
            setData(result)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [email, dateRange.startDate, dateRange.endDate, selectedInstance])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="glass-card p-6">
                    <div className="loading-shimmer h-16 w-16 rounded-full mb-4" />
                    <div className="loading-shimmer h-8 w-1/3 rounded mb-2" />
                    <div className="loading-shimmer h-4 w-1/4 rounded" />
                </div>
            </div>
        )
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchData} />
    }

    if (!data) return null

    // Calculate completion percentage
    const completionPercentage = data.expected_hours > 0
        ? (data.total_hours / data.expected_hours) * 100
        : 0

    // Get initials
    const initials = data.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    // Transform epic data for pie chart
    const epicPieData = data.epics.slice(0, 6).map(e => ({
        name: e.epic_name.length > 15 ? e.epic_name.substring(0, 15) + '...' : e.epic_name,
        value: e.total_hours,
        full_name: e.epic_name,
    }))

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

                    <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                        <span className="text-white font-bold text-xl">{initials}</span>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-dark-100">{data.full_name}</h1>
                        <p className="text-dark-400">{data.email}</p>
                        <span className="badge-blue mt-2 inline-block">{data.team_name}</span>
                    </div>

                    <div className="text-right">
                        <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                            {formatHours(data.total_hours)}
                        </p>
                        <p className="text-dark-400 text-sm">su {formatHours(data.expected_hours)} previste</p>
                    </div>
                </div>
                <div className="mt-4">
                    <ProgressBar value={data.total_hours} max={data.expected_hours} size="md" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Completamento"
                    value={`${Math.round(completionPercentage)}%`}
                    color={completionPercentage >= 90 ? 'green' : completionPercentage >= 70 ? 'blue' : 'orange'}
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Epic Lavorate"
                    value={data.epics.length}
                    color="purple"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Worklog Registrati"
                    value={data.worklogs.length}
                    color="blue"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    }
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Trend Giornaliero" subtitle="Ore registrate nel periodo">
                    <TrendChart data={data.daily_trend} height={280} />
                </ChartCard>

                <ChartCard title="Distribuzione Epic" subtitle="Come sono distribuite le ore">
                    {epicPieData.length > 0 ? (
                        <DistributionChart data={epicPieData} height={280} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-dark-400">
                            Nessuna epic nel periodo selezionato
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Epic Cards */}
            {data.epics.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Epic Lavorate</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.epics.map((epic) => (
                            <EpicCard
                                key={epic.epic_key}
                                epicKey={epic.epic_key}
                                name={epic.epic_name}
                                hours={epic.total_hours}
                                contributorCount={epic.contributor_count}
                                jiraInstance={epic.jira_instance}
                                onClick={() => navigate(`/epics/${encodeURIComponent(epic.epic_key)}`)}
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
                                <th className="table-header">Issue</th>
                                <th className="table-header">Parent</th>
                                <th className="table-header">Epic</th>
                                <th className="table-header text-right">Ore</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.worklogs.slice(0, 50).map((wl) => {
                                // Badge color based on parent type
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
                                return (
                                    <tr key={wl.id} className="hover:bg-dark-700/30 transition-colors">
                                        <td className="table-cell whitespace-nowrap">
                                            {format(new Date(wl.started), 'd MMM yyyy HH:mm', { locale: it })}
                                        </td>
                                        <td className="table-cell">
                                            <div>
                                                <button
                                                    onClick={() => navigate(`/issues/${encodeURIComponent(wl.issue_key)}`)}
                                                    className="text-accent-blue font-medium hover:underline"
                                                >
                                                    {wl.issue_key}
                                                </button>
                                                <p className="text-dark-400 text-sm truncate max-w-xs">{wl.issue_summary}</p>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            {wl.parent_key ? (
                                                <div>
                                                    <span className={getParentBadgeClass(wl.parent_type)}>{wl.parent_key}</span>
                                                    {wl.parent_name && (
                                                        <p className="text-dark-500 text-xs mt-1 truncate max-w-[150px]" title={wl.parent_name}>
                                                            {wl.parent_name}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-dark-500">—</span>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {wl.epic_key ? (
                                                <span className="badge-purple">{wl.epic_key}</span>
                                            ) : (
                                                <span className="text-dark-500">—</span>
                                            )}
                                        </td>
                                        <td className="table-cell text-right font-medium">
                                            {formatHours(wl.time_spent_seconds / 3600)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {data.worklogs.length > 50 && (
                        <div className="p-4 text-center text-dark-400 text-sm border-t border-dark-700">
                            Mostrati 50 di {data.worklogs.length} worklog
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
