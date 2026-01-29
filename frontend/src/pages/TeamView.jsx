import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeamDetail, getTeamMultiJiraOverview } from '../api/client'
import { formatHours } from '../hooks/useData'
import { StatCard, UserCard, EpicCard, ProgressBar, CardSkeleton, ErrorState, EmptyState } from '../components/Cards'
import { TrendChart, ComparisonBarChart, DistributionChart, MultiTrendChart, ChartCard } from '../components/Charts'

const instanceColors = [
    '#667eea', '#3fb950', '#a371f7', '#58a6ff', '#d29922', '#f85149',
]

export default function TeamView({ dateRange, selectedInstance }) {
    const { teamName } = useParams()
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
            const result = await getTeamDetail(teamName, dateRange.startDate, dateRange.endDate, selectedInstance)
            setData(result)

            // Fetch multi-JIRA overview when viewing "Tutti"
            if (isMultiJiraAll) {
                try {
                    const overview = await getTeamMultiJiraOverview(teamName, dateRange.startDate, dateRange.endDate)
                    if (overview.instances.length > 1) {
                        setOverviewData(overview)
                    } else {
                        setOverviewData(null)
                    }
                } catch {
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
    }, [teamName, dateRange.startDate, dateRange.endDate, selectedInstance, isMultiJiraAll])

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

    // Check if data is empty
    const isDataEmpty = data.members.length === 0 && data.total_hours === 0

    if (isDataEmpty) {
        return (
            <div className="space-y-6 animate-fade-in">
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
                        </div>
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun membro attivo"
                        message="Non ci sono ore registrate per questo team nel periodo selezionato."
                        icon={
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                        actionLabel="Torna alla Dashboard"
                        onAction={() => navigate('/')}
                    />
                </div>
            </div>
        )
    }

    // If multi-JIRA "Tutti" view, show multi-JIRA overview for this team
    if (overviewData) {
        // Comparison bar chart data
        const comparisonData = overviewData.instances.map(inst => ({
            name: inst.instance_name,
            total_hours: inst.total_hours,
        }))

        // Multi-trend series
        const trendSeries = overviewData.instances.map((inst, i) => ({
            name: inst.instance_name,
            data: inst.daily_trend,
            color: instanceColors[i % instanceColors.length],
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
                            <p className="text-dark-400">Panoramica istanze JIRA per il team</p>
                        </div>
                    </div>
                </div>

                {/* Instance Overview Cards */}
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Panoramica Istanze JIRA</h2>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${overviewData.instances.length >= 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
                        {overviewData.instances.map((inst, index) => (
                            <InstanceCard key={inst.instance_name} instance={inst} color={instanceColors[index % instanceColors.length]} />
                        ))}
                    </div>
                </div>

                {/* Comparison Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Ore per Istanza" subtitle="Confronto ore totali tra JIRA">
                        <ComparisonBarChart
                            data={comparisonData}
                            dataKey="total_hours"
                            nameKey="name"
                            height={overviewData.instances.length * 60 + 50}
                            horizontal
                        />
                    </ChartCard>

                    <ChartCard title="Trend per Istanza" subtitle="Ore registrate per JIRA">
                        <MultiTrendChart series={trendSeries} height={280} />
                    </ChartCard>
                </div>

                {/* Complementary Comparisons */}
                {overviewData.complementary_comparisons.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-dark-100">Confronto Istanze Complementari</h2>
                        {overviewData.complementary_comparisons.map((comp) => (
                            <ComplementaryCard key={comp.group_name} comparison={comp} />
                        ))}
                    </div>
                )}

                {/* Members Section */}
                {data.members.length > 0 && (
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
                                data={data.members.map(m => ({
                                    name: m.full_name.split(' ')[0],
                                    total_hours: m.total_hours,
                                    full_name: m.full_name,
                                }))}
                                dataKey="total_hours"
                                nameKey="name"
                                height={data.members.length * 50 + 50}
                                horizontal
                            />
                        </ChartCard>
                    </div>
                )}
            </div>
        )
    }

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
                    label="Iniziative Lavorate"
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

            {/* Iniziative Section */}
            {data.epics.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-dark-100 mb-4">Iniziative Lavorate</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {data.epics.slice(0, 8).map((epic) => (
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
        </div>
    )
}


function InstanceCard({ instance, color }) {
    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold text-dark-100">{instance.instance_name}</h3>
                    <p className="text-xs text-dark-400">
                        {instance.initiative_count} iniziative &middot; {instance.contributor_count} contributori
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-dark-400">Ore Totali</p>
                    <p className="text-2xl font-bold" style={{ color }}>
                        {formatHours(instance.total_hours)}
                    </p>
                    <p className="text-xs text-dark-500">su {formatHours(instance.expected_hours)} previste</p>
                </div>
                <div>
                    <p className="text-sm text-dark-400">Completamento</p>
                    <p className="text-2xl font-bold" style={{ color }}>
                        {Math.round(instance.completion_percentage)}%
                    </p>
                    <p className="text-xs text-dark-500">
                        {instance.completion_percentage >= 90 ? 'Ottimo!' : instance.completion_percentage >= 70 ? 'Buono' : 'In corso'}
                    </p>
                </div>
            </div>
        </div>
    )
}


function ComplementaryCard({ comparison }) {
    const totalDelta = Math.abs(comparison.primary_total_hours - comparison.secondary_total_hours)

    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-orange/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold text-dark-100">{comparison.group_name}</h3>
                    <p className="text-xs text-dark-400">
                        {comparison.primary_instance} vs {comparison.secondary_instance}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">{comparison.primary_instance}</p>
                    <p className="text-xl font-bold text-accent-blue">{formatHours(comparison.primary_total_hours)}</p>
                </div>
                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">{comparison.secondary_instance}</p>
                    <p className="text-xl font-bold text-accent-green">{formatHours(comparison.secondary_total_hours)}</p>
                </div>
                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">Delta</p>
                    <p className={`text-xl font-bold ${totalDelta > 5 ? 'text-accent-red' : totalDelta > 1 ? 'text-accent-orange' : 'text-accent-green'}`}>
                        {formatHours(totalDelta)}
                    </p>
                </div>
            </div>

            {comparison.discrepancies.length > 0 ? (
                <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-3">
                        Discrepanze ({comparison.discrepancies.length})
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-600">
                                    <th className="text-left py-2 px-3 text-dark-400 font-medium">Iniziativa</th>
                                    <th className="text-right py-2 px-3 text-dark-400 font-medium">{comparison.primary_instance}</th>
                                    <th className="text-right py-2 px-3 text-dark-400 font-medium">{comparison.secondary_instance}</th>
                                    <th className="text-right py-2 px-3 text-dark-400 font-medium">Delta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparison.discrepancies.map((disc) => {
                                    const severity = disc.delta_hours > 8 ? 'high' : disc.delta_hours > 2 ? 'medium' : 'low'
                                    const badgeClass = severity === 'high'
                                        ? 'bg-red-500/20 text-red-400'
                                        : severity === 'medium'
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                    return (
                                        <tr key={disc.initiative_key} className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
                                            <td className="py-2 px-3">
                                                <span className="text-dark-200 font-medium">{disc.initiative_key}</span>
                                                <span className="text-dark-400 ml-2 truncate">{disc.initiative_name}</span>
                                            </td>
                                            <td className="text-right py-2 px-3 text-dark-200">{formatHours(disc.primary_hours)}</td>
                                            <td className="text-right py-2 px-3 text-dark-200">{formatHours(disc.secondary_hours)}</td>
                                            <td className="text-right py-2 px-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
                                                    {formatHours(disc.delta_hours)} ({disc.delta_percentage}%)
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <p className="text-dark-400 text-sm text-center py-2">Nessuna discrepanza significativa</p>
            )}
        </div>
    )
}
