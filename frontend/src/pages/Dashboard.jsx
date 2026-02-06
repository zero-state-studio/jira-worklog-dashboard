import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getMultiJiraOverview } from '../api/client'
import { useFetch, formatHours } from '../hooks/useData'
import { StatCard, TeamCard, EpicCard, CircularProgress, CardSkeleton, ErrorState, EmptyState } from '../components/Cards'
import { TrendChart, ComparisonBarChart, MultiTrendChart, ChartCard } from '../components/Charts'
import MultiJiraSection from '../components/MultiJiraStats'

const instanceColors = [
    '#667eea', '#3fb950', '#a371f7', '#58a6ff', '#d29922', '#f85149',
]

export default function Dashboard({ dateRange, selectedInstance }) {
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [overviewData, setOverviewData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const isMultiJiraAll = selectedInstance === null

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getDashboard(dateRange.startDate, dateRange.endDate, selectedInstance)
            setData(result)

            // Fetch multi-JIRA overview when viewing "Tutti"
            if (isMultiJiraAll) {
                try {
                    const overview = await getMultiJiraOverview(dateRange.startDate, dateRange.endDate)
                    // Only set if there are multiple instances
                    if (overview.instances.length > 1) {
                        setOverviewData(overview)
                    } else {
                        setOverviewData(null)
                    }
                } catch {
                    // Non-blocking: overview is optional
                    setOverviewData(null)
                }
            } else {
                setOverviewData(null)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [dateRange.startDate, dateRange.endDate, selectedInstance, isMultiJiraAll])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardSkeleton count={4} />
                </div>
            </div>
        )
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchData} />
    }

    if (!data) return null

    // Check if data is empty (no teams and no epics)
    const isDataEmpty = data.teams.length === 0 && data.top_epics.length === 0

    if (isDataEmpty) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
                        <p className="text-dark-400">Panoramica delle ore registrate</p>
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun dato disponibile"
                        message="Configura un'istanza JIRA nelle Impostazioni e sincronizza i worklog per visualizzare la dashboard."
                        icon={
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                        actionLabel="Vai alle Impostazioni"
                        onAction={() => navigate('/settings')}
                    />
                </div>
            </div>
        )
    }

    // If multi-JIRA "Tutti" view, show only the multi-JIRA overview
    if (overviewData) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
                        <p className="text-dark-400">Panoramica globale delle istanze JIRA</p>
                    </div>
                </div>
                <MultiJiraSection overview={overviewData} navigate={navigate} />
            </div>
        )
    }

    // Standard single-instance dashboard
    // Transform team data for bar chart
    const teamChartData = data.teams.map(t => ({
        name: t.team_name,
        total_hours: t.total_hours,
    }))

    // Transform epic data for bar chart
    const epicChartData = data.top_epics.slice(0, 5).map(e => ({
        name: e.epic_name.length > 20 ? e.epic_name.substring(0, 20) + '...' : e.epic_name,
        total_hours: e.total_hours,
        full_name: e.epic_name,
    }))

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
                    <p className="text-dark-400">Panoramica delle ore registrate</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Ore Totali"
                    value={formatHours(data.total_hours)}
                    subtitle={`su ${formatHours(data.expected_hours)} previste`}
                    color="primary"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Completamento"
                    value={`${Math.round(data.completion_percentage)}%`}
                    subtitle={data.completion_percentage >= 90 ? 'Ottimo!' : data.completion_percentage >= 70 ? 'Buono' : 'In corso'}
                    color={data.completion_percentage >= 90 ? 'green' : data.completion_percentage >= 70 ? 'blue' : 'orange'}
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Team Attivi"
                    value={data.teams.length}
                    subtitle={`${data.teams.reduce((sum, t) => sum + t.member_count, 0)} membri totali`}
                    color="purple"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Iniziative Attive"
                    value={data.top_epics.length}
                    subtitle="Epic, Project e altro"
                    color="blue"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    }
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <ChartCard
                    title="Trend Giornaliero"
                    subtitle="Ore registrate per giorno"
                    className="lg:col-span-2"
                >
                    <TrendChart data={data.daily_trend} height={280} />
                </ChartCard>

                {/* Completion Ring */}
                <div className="glass-card p-6 flex flex-col items-center justify-center">
                    <h3 className="font-semibold text-dark-100 mb-4">Progresso Periodo</h3>
                    <CircularProgress
                        value={data.total_hours}
                        max={data.expected_hours}
                        size={180}
                        strokeWidth={12}
                    />
                </div>
            </div>

            {/* Teams Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Cards */}
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Ore per Team</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.teams.map((team, index) => (
                            <TeamCard
                                key={team.team_name}
                                name={team.team_name}
                                hours={team.total_hours}
                                memberCount={team.member_count}
                                onClick={() => navigate(`/teams/${encodeURIComponent(team.team_name)}`)}
                            />
                        ))}
                    </div>
                </div>

                {/* Team Bar Chart */}
                <ChartCard title="Confronto Team" subtitle="Distribuzione ore tra i team">
                    <ComparisonBarChart
                        data={teamChartData}
                        dataKey="total_hours"
                        nameKey="name"
                        height={data.teams.length * 50 + 50}
                        horizontal
                    />
                </ChartCard>
            </div>

            {/* Iniziative Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-dark-100">Top Iniziative</h2>
                    <button
                        onClick={() => navigate('/epics')}
                        className="text-accent-blue hover:text-accent-blue/80 text-sm font-medium transition-colors"
                    >
                        Vedi tutte →
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {data.top_epics.slice(0, 5).map((epic) => (
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
        </div>
    )
}



