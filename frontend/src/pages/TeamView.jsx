import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeamDetail, getTeamMultiJiraOverview } from '../api/client'
import { formatHours } from '../hooks/useData'
import { StatCard, UserCard, EpicCard, ProgressBar, CardSkeleton, ErrorState, EmptyState } from '../components/Cards'
import { ComparisonBarChart, DistributionChart, MultiTrendChart, ChartCard } from '../components/Charts'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

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

                {/* Members Section with per-JIRA breakdown */}
                {data.members.length > 0 && (() => {
                    // Build per-member per-instance hours map
                    const memberInstanceHours = {}
                    const instanceNames = overviewData.instances.map(inst => inst.instance_name)
                    overviewData.instances.forEach(inst => {
                        (inst.members || []).forEach(m => {
                            if (!memberInstanceHours[m.email]) memberInstanceHours[m.email] = {}
                            memberInstanceHours[m.email][inst.instance_name] = m.total_hours
                        })
                    })

                    // Build grouped bar chart data
                    const groupedChartData = data.members.map(m => {
                        const row = { name: m.full_name.split(' ')[0], full_name: m.full_name }
                        instanceNames.forEach(instName => {
                            row[instName] = memberInstanceHours[m.email]?.[instName] || 0
                        })
                        return row
                    })

                    return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h2 className="text-lg font-semibold text-dark-100 mb-4">Membri del Team</h2>
                                <div className="space-y-3">
                                    {data.members.map((member) => {
                                        const instHours = memberInstanceHours[member.email] || {}
                                        return (
                                            <div
                                                key={member.email}
                                                onClick={() => navigate(`/app/users/${encodeURIComponent(member.email)}`)}
                                                className="glass-card-hover p-4 flex items-center gap-4"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white font-semibold">
                                                        {(member.full_name || member.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-dark-100 truncate">{member.full_name}</h4>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {instanceNames.map((instName, i) => {
                                                            const h = instHours[instName] || 0
                                                            if (h === 0) return null
                                                            return (
                                                                <span
                                                                    key={instName}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                                                    style={{
                                                                        backgroundColor: `${instanceColors[i % instanceColors.length]}20`,
                                                                        color: instanceColors[i % instanceColors.length],
                                                                    }}
                                                                >
                                                                    {instName}: {formatHours(h)}
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-semibold text-dark-100">{formatHours(member.total_hours)}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <ChartCard title="Confronto Membri" subtitle="Ore per membro per istanza JIRA">
                                <ResponsiveContainer width="100%" height={data.members.length * 50 + 50}>
                                    <BarChart
                                        data={groupedChartData}
                                        layout="vertical"
                                        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal vertical={false} />
                                        <XAxis
                                            type="number"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#8b949e', fontSize: 12 }}
                                            tickFormatter={(value) => `${value}h`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#c9d1d9', fontSize: 12 }}
                                            width={90}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null
                                                return (
                                                    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
                                                        <p className="text-dark-300 text-sm mb-2">{payload[0]?.payload?.full_name || label}</p>
                                                        {payload.map((entry, index) => (
                                                            <div key={index} className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                <span className="text-dark-400 text-sm">{entry.name}:</span>
                                                                <span className="text-dark-200 font-medium">{formatHours(entry.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            height={36}
                                            wrapperStyle={{ color: '#c9d1d9', fontSize: 12 }}
                                        />
                                        {instanceNames.map((instName, i) => (
                                            <Bar
                                                key={instName}
                                                dataKey={instName}
                                                name={instName}
                                                fill={instanceColors[i % instanceColors.length]}
                                                radius={[0, 4, 4, 0]}
                                                maxBarSize={20}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    )
                })()}
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
                                onClick={() => navigate(`/app/users/${encodeURIComponent(member.email)}`)}
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

            {/* Distribuzione Iniziative */}
            <ChartCard title="Distribuzione Iniziative" subtitle="Come sono distribuite le ore">
                {initiativePieData.length > 0 ? (
                    <DistributionChart data={initiativePieData} height={280} />
                ) : (
                    <div className="h-64 flex items-center justify-center text-dark-400">
                        Nessuna iniziativa nel periodo selezionato
                    </div>
                )}
            </ChartCard>

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
                                onClick={() => navigate(`/app/epics/${encodeURIComponent(epic.epic_key)}`)}
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
