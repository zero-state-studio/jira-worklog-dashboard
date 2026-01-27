import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeamDetail } from '../api/client'
import { formatHours } from '../hooks/useData'
import { StatCard, UserCard, EpicCard, ProgressBar, CardSkeleton, ErrorState } from '../components/Cards'
import { TrendChart, ComparisonBarChart, DistributionChart, ChartCard } from '../components/Charts'

export default function TeamView({ dateRange, selectedInstance }) {
    const { teamName } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getTeamDetail(teamName, dateRange.startDate, dateRange.endDate, selectedInstance)
            setData(result)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [teamName, dateRange.startDate, dateRange.endDate, selectedInstance])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="glass-card p-6">
                    <div className="loading-shimmer h-8 w-1/3 rounded mb-2" />
                    <div className="loading-shimmer h-4 w-1/4 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CardSkeleton count={3} />
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

    // Transform member data for bar chart
    const memberChartData = data.members.map(m => ({
        name: m.full_name.split(' ')[0], // First name only for chart
        total_hours: m.total_hours,
        full_name: m.full_name,
    }))

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
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                    >
                        <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-dark-100">{data.team_name}</h1>
                        <p className="text-dark-400">{data.members.length} membri</p>
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
                    label="Media per Membro"
                    value={formatHours(data.total_hours / data.members.length)}
                    color="primary"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                />
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
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Trend Giornaliero" subtitle="Ore registrate dal team">
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

            {/* Members Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Membri del Team</h2>
                    <div className="space-y-3">
                        {data.members.map((member) => (
                            <UserCard
                                key={member.email}
                                name={member.full_name}
                                email={member.email}
                                hours={member.total_hours}
                                teamName={data.team_name}
                                onClick={() => navigate(`/users/${encodeURIComponent(member.email)}`)}
                            />
                        ))}
                    </div>
                </div>

                <ChartCard title="Confronto Membri" subtitle="Ore per membro del team">
                    <ComparisonBarChart
                        data={memberChartData}
                        dataKey="total_hours"
                        nameKey="name"
                        height={data.members.length * 50 + 50}
                        horizontal
                    />
                </ChartCard>
            </div>

            {/* Epics Section */}
            {data.epics.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Epic Lavorate</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {data.epics.slice(0, 8).map((epic) => (
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
        </div>
    )
}
