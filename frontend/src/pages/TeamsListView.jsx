import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getMultiJiraOverview } from '../api/client'
import { formatHours } from '../hooks/useData'
import { StatCard, ProgressBar, MultiProgressBar, CardSkeleton, ErrorState, EmptyState } from '../components/Cards'
import { ComparisonBarChart, ChartCard } from '../components/Charts'

const instanceColors = [
    '#667eea', '#3fb950', '#a371f7', '#58a6ff', '#d29922', '#f85149',
]

export default function TeamsListView({ dateRange, selectedInstance }) {
    const navigate = useNavigate()
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getDashboard(dateRange.startDate, dateRange.endDate, selectedInstance)
            setTeams(result.teams || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [dateRange.startDate, dateRange.endDate, selectedInstance])

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

    if (!teams || teams.length === 0) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-dark-100">Team</h1>
                        <p className="text-dark-400">Panoramica dei team configurati</p>
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun team configurato"
                        message="Crea dei team nelle Impostazioni per visualizzare le statistiche aggregate."
                        icon={
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                        actionLabel="Vai alle Impostazioni"
                        onAction={() => navigate('/settings')}
                    />
                </div>
            </div>
        )
    }

    // Calculate aggregate stats
    const totalHours = teams.reduce((sum, t) => sum + t.total_hours, 0)
    const totalExpected = teams.reduce((sum, t) => sum + t.expected_hours, 0)
    const avgCompletion = totalExpected > 0 ? (totalHours / totalExpected) * 100 : 0
    const totalMembers = teams.reduce((sum, t) => sum + t.member_count, 0)

    // Chart data
    const chartData = teams.map(t => ({
        name: t.name,
        total_hours: t.total_hours,
    }))

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Team</h1>
                    <p className="text-dark-400">Panoramica dei {teams.length} team configurati</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Team Totali"
                    value={teams.length}
                    subtitle={`${totalMembers} membri totali`}
                    color="primary"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Ore Totali"
                    value={formatHours(totalHours)}
                    subtitle={`su ${formatHours(totalExpected)} previste`}
                    color="blue"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Completamento Medio"
                    value={`${Math.round(avgCompletion)}%`}
                    subtitle={avgCompletion >= 90 ? 'Ottimo!' : avgCompletion >= 70 ? 'Buono' : 'In corso'}
                    color={avgCompletion >= 90 ? 'green' : avgCompletion >= 70 ? 'blue' : 'orange'}
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Media per Team"
                    value={formatHours(totalHours / teams.length)}
                    color="purple"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                />
            </div>

            {/* Chart & Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teams Chart */}
                <ChartCard title="Confronto Team" subtitle="Ore per team nel periodo">
                    <ComparisonBarChart
                        data={chartData}
                        dataKey="total_hours"
                        nameKey="name"
                        height={teams.length * 50 + 50}
                        horizontal
                    />
                </ChartCard>

                {/* Teams Grid */}
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Dettaglio Team</h2>
                    <div className="space-y-3">
                        {teams.map((team) => {
                            const completion = team.expected_hours > 0
                                ? (team.total_hours / team.expected_hours) * 100
                                : 0

                            // Check if we have per-instance breakdown
                            const hasInstanceData = team.hours_by_instance && Object.keys(team.hours_by_instance).length > 0
                            const instanceNames = hasInstanceData ? Object.keys(team.hours_by_instance) : []

                            return (
                                <div
                                    key={team.name}
                                    className="glass-card-hover p-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-dark-100">{team.name}</h3>
                                                <p className="text-xs text-dark-400">{team.member_count} membri</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-dark-100">{formatHours(team.total_hours)}</p>
                                            <p className="text-xs text-dark-500">su {formatHours(team.expected_hours)}</p>
                                        </div>
                                    </div>

                                    {/* Show per-instance breakdown in "Tutti" view */}
                                    {hasInstanceData && instanceNames.length > 1 ? (
                                        <MultiProgressBar
                                            segments={instanceNames.map((name, idx) => ({
                                                value: team.hours_by_instance[name],
                                                label: name,
                                                color: instanceColors[idx % instanceColors.length]
                                            }))}
                                            max={team.expected_hours}
                                            size="sm"
                                        />
                                    ) : (
                                        <ProgressBar value={team.total_hours} max={team.expected_hours} size="sm" />
                                    )}

                                    {/* Instance breakdown chips */}
                                    {hasInstanceData && instanceNames.length > 1 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {instanceNames.map((name, idx) => (
                                                <span
                                                    key={name}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                                                    style={{ backgroundColor: `${instanceColors[idx % instanceColors.length]}20`, color: instanceColors[idx % instanceColors.length] }}
                                                >
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: instanceColors[idx % instanceColors.length] }} />
                                                    {name}: {formatHours(team.hours_by_instance[name])}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-3">
                                        <span className={`text-xs font-medium ${completion >= 90 ? 'text-accent-green' : completion >= 70 ? 'text-accent-blue' : 'text-accent-orange'}`}>
                                            {Math.round(completion)}% completato
                                        </span>
                                        <button
                                            onClick={() => navigate(`/app/teams/${encodeURIComponent(team.name)}`)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent-purple bg-accent-purple/10 rounded-lg hover:bg-accent-purple/20 transition-colors"
                                        >
                                            Vai al Team
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
