import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetail } from '../api/client'
import { formatHours } from '../hooks/useData'
import { StatCard, ProgressBar, EpicCard, ErrorState } from '../components/Cards'
import { TrendChart, DistributionChart, ChartCard } from '../components/Charts'
import WorklogCalendar from '../components/WorklogCalendar'

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

    // Transform initiative data for pie chart
    const initiativePieData = data.epics.slice(0, 6).map(e => ({
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
                    label="Iniziative Lavorate"
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

                <ChartCard title="Distribuzione Iniziative" subtitle="Come sono distribuite le ore">
                    {initiativePieData.length > 0 ? (
                        <DistributionChart data={initiativePieData} height={280} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-dark-400">
                            Nessuna iniziativa nel periodo selezionato
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Initiative Cards */}
            {data.epics.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Iniziative Lavorate</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.epics.map((epic) => (
                            <EpicCard
                                key={epic.epic_key}
                                epicKey={epic.epic_key}
                                name={epic.epic_name}
                                hours={epic.total_hours}
                                contributorCount={epic.contributor_count}
                                jiraInstance={epic.jira_instance}
                                parentType={epic.parent_type}
                                onClick={() => navigate(`/epics/${encodeURIComponent(epic.epic_key)}`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Calendario Worklog */}
            <WorklogCalendar
                worklogs={data.worklogs}
                onUserClick={(email) => navigate(`/users/${encodeURIComponent(email)}`)}
            />
        </div>
    )
}
