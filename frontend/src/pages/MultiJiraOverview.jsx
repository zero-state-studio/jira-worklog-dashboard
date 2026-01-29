import { useState, useEffect, useCallback } from 'react'
import { getMultiJiraOverview } from '../api/client'
import { formatHours } from '../hooks/useData'
import { StatCard, CardSkeleton, ErrorState } from '../components/Cards'
import { ComparisonBarChart, MultiTrendChart, ChartCard } from '../components/Charts'

const instanceColors = [
    '#667eea', // Purple-blue
    '#3fb950', // Green
    '#a371f7', // Purple
    '#58a6ff', // Blue
    '#d29922', // Orange
    '#f85149', // Red
]

export default function MultiJiraOverview({ dateRange }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getMultiJiraOverview(dateRange.startDate, dateRange.endDate)
            setData(result)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [dateRange.startDate, dateRange.endDate])

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <CardSkeleton count={3} />
                </div>
            </div>
        )
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchData} />
    }

    if (!data || data.instances.length === 0) return null

    // Prepare comparison bar chart data
    const comparisonData = data.instances.map(inst => ({
        name: inst.instance_name,
        total_hours: inst.total_hours,
    }))

    // Prepare multi-trend series
    const trendSeries = data.instances.map((inst, i) => ({
        name: inst.instance_name,
        data: inst.daily_trend,
        color: instanceColors[i % instanceColors.length],
    }))

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Panoramica JIRA</h1>
                    <p className="text-dark-400">Confronto tra le istanze JIRA configurate</p>
                </div>
            </div>

            {/* Instance Overview Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${data.instances.length >= 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
                {data.instances.map((inst, index) => (
                    <InstanceCard key={inst.instance_name} instance={inst} color={instanceColors[index % instanceColors.length]} />
                ))}
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Ore per Istanza" subtitle="Confronto ore totali tra JIRA">
                    <ComparisonBarChart
                        data={comparisonData}
                        dataKey="total_hours"
                        nameKey="name"
                        height={data.instances.length * 60 + 50}
                        horizontal
                    />
                </ChartCard>

                <ChartCard title="Trend Giornaliero" subtitle="Ore registrate per istanza">
                    <MultiTrendChart series={trendSeries} height={280} />
                </ChartCard>
            </div>

            {/* Complementary Comparisons */}
            {data.complementary_comparisons.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-dark-100">Confronto Istanze Complementari</h2>
                    {data.complementary_comparisons.map((comp) => (
                        <ComplementarySection key={comp.group_name} comparison={comp} />
                    ))}
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


function ComplementarySection({ comparison }) {
    const totalDelta = Math.abs(comparison.primary_total_hours - comparison.secondary_total_hours)

    return (
        <div className="glass-card p-6 space-y-4">
            {/* Group Header */}
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

            {/* Summary Cards */}
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

            {/* Discrepancies Table */}
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
                                {comparison.discrepancies.map((disc) => (
                                    <DiscrepancyRow key={disc.initiative_key} discrepancy={disc} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-dark-400 text-sm">Nessuna discrepanza significativa trovata</p>
                </div>
            )}
        </div>
    )
}


function DiscrepancyRow({ discrepancy }) {
    const severity = discrepancy.delta_hours > 8 ? 'high' : discrepancy.delta_hours > 2 ? 'medium' : 'low'
    const badgeClass = severity === 'high'
        ? 'bg-red-500/20 text-red-400'
        : severity === 'medium'
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-yellow-500/20 text-yellow-400'

    return (
        <tr className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
            <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                    <span className="text-dark-200 font-medium">{discrepancy.initiative_key}</span>
                    <span className="text-dark-400 truncate max-w-[200px]">{discrepancy.initiative_name}</span>
                </div>
            </td>
            <td className="text-right py-2 px-3 text-dark-200">{formatHours(discrepancy.primary_hours)}</td>
            <td className="text-right py-2 px-3 text-dark-200">{formatHours(discrepancy.secondary_hours)}</td>
            <td className="text-right py-2 px-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
                    {formatHours(discrepancy.delta_hours)} ({discrepancy.delta_percentage}%)
                </span>
            </td>
        </tr>
    )
}
