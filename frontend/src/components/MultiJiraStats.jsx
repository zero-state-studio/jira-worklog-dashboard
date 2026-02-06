import { formatHours } from '../hooks/useData'
import { CardSkeleton, ErrorState, EmptyState } from './Cards'
import { TrendChart, ComparisonBarChart, MultiTrendChart, GroupedBarChart, ChartCard } from './Charts'

const instanceColors = [
    '#667eea', '#3fb950', '#a371f7', '#58a6ff', '#d29922', '#f85149',
]

/**
 * Main wrapper component (legacy support or unified view)
 */
export default function MultiJiraSection({ overview, navigate, users }) {
    return (
        <>
            <MultiJiraOverview overview={overview} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <MultiJiraCharts overview={overview} users={users} />
            </div>
            <ComplementaryComparisons overview={overview} />
        </>
    )
}

/**
 * Overview Cards Section
 */
export function MultiJiraOverview({ overview }) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Panoramica Istanze JIRA</h2>
            <div className={`grid grid-cols-1 md:grid-cols-2 ${overview.instances.length >= 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
                {overview.instances.map((inst, index) => (
                    <InstanceCard key={inst.instance_name} instance={inst} color={instanceColors[index % instanceColors.length]} />
                ))}
            </div>
        </div>
    )
}

/**
 * Charts Section
 */
export function MultiJiraCharts({ overview, users }) {
    // Multi-trend series
    const trendSeries = overview.instances.map((inst, i) => ({
        name: inst.instance_name,
        data: inst.daily_trend,
        color: instanceColors[i % instanceColors.length],
    }))

    // Grouped Bar Chart Data (Users breakdown)
    let groupedChartData = []
    let instanceNames = overview.instances.map(i => i.instance_name).sort()

    if (users && users.length > 0) {
        groupedChartData = users
            .slice(0, 30) // Show up to 30 users
            .map(u => {
                const row = {
                    name: u.full_name.split(' ')[0],
                    full_name: u.full_name,
                }

                // Add hours for each instance
                instanceNames.forEach(inst => {
                    row[inst] = u.hours_by_instance?.[inst] || 0
                })
                return row
            })
    }

    // Fallback for Comparison Data (Total hours per instance) - used if no users provided or as alternative
    const comparisonData = overview.instances.map(inst => ({
        name: inst.instance_name,
        total_hours: inst.total_hours,
    }))

    return (
        <>
            {users ? (
                <ChartCard title="Confronto Membri" subtitle="Ore per membro per istanza JIRA">
                    <GroupedBarChart
                        data={groupedChartData}
                        keys={instanceNames}
                        height={Math.max(300, groupedChartData.length * 40 + 50)}
                        colors={instanceColors}
                    />
                </ChartCard>
            ) : (
                <ChartCard title="Ore per Istanza" subtitle="Confronto ore totali tra JIRA">
                    <ComparisonBarChart
                        data={comparisonData}
                        dataKey="total_hours"
                        nameKey="name"
                        height={overview.instances.length * 60 + 50}
                        horizontal
                    />
                </ChartCard>
            )}

            <ChartCard title="Trend per Istanza" subtitle="Ore registrate per JIRA">
                <MultiTrendChart series={trendSeries} height={280} />
            </ChartCard>
        </>
    )
}

/**
 * Complementary Comparisons Section
 */
export function ComplementaryComparisons({ overview }) {
    if (!overview.complementary_comparisons || overview.complementary_comparisons.length === 0) return null;

    return (
        <div className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-dark-100">Confronto Istanze Complementari</h2>
            {overview.complementary_comparisons.map((comp) => (
                <ComplementaryCard key={comp.group_name} comparison={comp} />
            ))}
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

