import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getIssues, getEpicDetail } from '../api/client'
import { formatHours } from '../hooks/useData'
import { UserCard, StatCard, ErrorState, CardSkeleton, EmptyState } from '../components/Cards'
import { TrendChart, ComparisonBarChart, ChartCard } from '../components/Charts'
import WorklogCalendar from '../components/WorklogCalendar'

const instanceColors = [
    '#667eea', '#3fb950', '#a371f7', '#58a6ff', '#d29922', '#f85149',
]

export default function EpicView({ dateRange, selectedInstance }) {
    const { epicKey } = useParams()
    const navigate = useNavigate()
    const [listData, setListData] = useState(null)
    const [detailData, setDetailData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchParams, setSearchParams] = useSearchParams()
    const typeFilter = searchParams.get('type') || 'all'

    const setTypeFilter = (type) => {
        if (type === 'all') {
            setSearchParams({})
        } else {
            setSearchParams({ type })
        }
    }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            if (epicKey) {
                // Fetch epic detail
                const result = await getEpicDetail(epicKey, dateRange.startDate, dateRange.endDate, selectedInstance)
                setDetailData(result)
                setListData(null)
            } else {
                // Fetch issue list
                const result = await getIssues(dateRange.startDate, dateRange.endDate, selectedInstance)
                setListData(result)
                setDetailData(null)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [epicKey, dateRange.startDate, dateRange.endDate, selectedInstance])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6 animate-slide-up">
                <div className="glass-card p-6">
                    <div className="loading-shimmer h-8 w-1/3 rounded mb-2" />
                    <div className="loading-shimmer h-4 w-1/4 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardSkeleton count={8} />
                </div>
            </div>
        )
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchData} />
    }

    // Epic Detail View
    if (detailData) {
        return <EpicDetailView data={detailData} navigate={navigate} />
    }

    // Issue List View
    if (listData) {
        // Build unique instance list for color assignment
        const uniqueInstances = [...new Set(listData.issues.map(i => i.jira_instance))].sort()

        // Count by parent_type
        const typeCounts = {}
        for (const issue of listData.issues) {
            const t = issue.parent_type || 'Other'
            typeCounts[t] = (typeCounts[t] || 0) + 1
        }

        // Apply type filter, then search filter
        const typeFiltered = typeFilter === 'all'
            ? listData.issues
            : listData.issues.filter(i => (i.parent_type || 'Other') === typeFilter)

        const filteredIssues = typeFiltered.filter(issue => {
            if (!searchQuery) return true
            const query = searchQuery.toLowerCase()
            return (
                issue.issue_key.toLowerCase().includes(query) ||
                issue.issue_summary.toLowerCase().includes(query) ||
                (issue.parent_key && issue.parent_key.toLowerCase().includes(query)) ||
                (issue.parent_name && issue.parent_name.toLowerCase().includes(query))
            )
        })

        const filteredHours = filteredIssues.reduce((sum, i) => sum + i.total_hours, 0)

        return (
            <div className="space-y-6 animate-slide-up">
                {/* Header */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">Issues</h1>
                            <p className="text-tertiary">
                                {searchQuery || typeFilter !== 'all'
                                    ? `${filteredIssues.length} di ${listData.total_count} issues`
                                    : `${listData.total_count} issues con ore registrate nel periodo`
                                }
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold bg-accent bg-clip-text text-transparent">
                                {formatHours(filteredHours)}
                            </p>
                            <p className="text-tertiary text-sm">ore totali</p>
                        </div>
                    </div>

                    {/* Type Filter Tabs */}
                    {Object.keys(typeCounts).length > 1 && (
                        <div className="flex gap-2 mt-4 flex-wrap">
                            <button
                                onClick={() => setTypeFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    typeFilter === 'all'
                                        ? 'bg-accent text-white '
                                        : 'text-tertiary hover:text-secondary hover:bg-surface bg-surface'
                                }`}
                            >
                                Tutti ({listData.total_count})
                            </button>
                            {Object.entries(typeCounts).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        typeFilter === type
                                            ? type === 'Project' ? 'bg-accent-blue text-white'
                                            : type === 'Epic' ? 'bg-accent-purple text-white'
                                            : 'bg-accent-green text-white'
                                            : 'text-tertiary hover:text-secondary hover:bg-surface bg-surface'
                                    }`}
                                >
                                    {type} ({count})
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative mt-4">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cerca per codice issue, titolo o iniziativa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-surface border border-solid rounded-lg text-primary placeholder-dark-500 focus:outline-none focus:border-focus focus:ring-1 focus:ring-accent-blue"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Issues Table */}
                {filteredIssues.length > 0 ? (
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-solid">
                                        <th className="text-left px-4 py-3 text-sm font-medium text-tertiary">Issue</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-tertiary">Titolo</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-tertiary">Iniziativa</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-tertiary">Istanza</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-tertiary">Ore</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-tertiary">Contributori</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredIssues.map((issue) => {
                                        const instIdx = uniqueInstances.indexOf(issue.jira_instance)
                                        const instColor = instanceColors[instIdx >= 0 ? instIdx % instanceColors.length : 0]
                                        return (
                                            <tr
                                                key={issue.issue_key}
                                                onClick={() => navigate(`/app/issues/${encodeURIComponent(issue.issue_key)}`)}
                                                className="border-b border-dark-800 hover:bg-surface/50 cursor-pointer transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="badge-purple text-xs">{issue.issue_key}</span>
                                                </td>
                                                <td className="px-4 py-3 text-secondary max-w-md">
                                                    <span className="block truncate">{issue.issue_summary}</span>
                                                </td>
                                                <td className="px-4 py-3 text-tertiary text-sm max-w-xs">
                                                    <span className="block truncate">{issue.parent_name || '-'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{
                                                            backgroundColor: `${instColor}20`,
                                                            color: instColor,
                                                        }}
                                                    >
                                                        {issue.jira_instance}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-primary">{formatHours(issue.total_hours)}</td>
                                                <td className="px-4 py-3 text-right text-tertiary">{issue.contributor_count}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : searchQuery ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 rounded-lg bg-surface flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-secondary mb-2">Nessun risultato</h3>
                        <p className="text-tertiary mb-4">Nessuna issue trovata per &ldquo;{searchQuery}&rdquo;</p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-surface text-secondary hover:bg-surface-hover transition-colors"
                        >
                            Cancella ricerca
                        </button>
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 rounded-lg bg-surface flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-secondary mb-2">Nessuna Issue</h3>
                        <p className="text-tertiary">Non ci sono issues con ore registrate nel periodo selezionato</p>
                    </div>
                )}
            </div>
        )
    }

    return null
}

function EpicDetailView({ data, navigate }) {
    // Check if data is empty
    const isDataEmpty = data.worklogs.length === 0 && data.total_hours === 0

    if (isDataEmpty) {
        return (
            <div className="space-y-6 animate-slide-up">
                <div className="glass-card p-6">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => navigate('/epics')}
                            className="p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                        >
                            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="badge-purple">{data.epic_key}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-primary">{data.epic_name}</h1>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun worklog registrato"
                        message="Non ci sono ore registrate per questa iniziativa nel periodo selezionato."
                        icon={
                            <svg className="w-8 h-8 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        actionLabel="Torna alle Iniziative"
                        onAction={() => navigate('/epics')}
                    />
                </div>
            </div>
        )
    }

    // Transform contributor data for bar chart
    const contributorChartData = data.contributors.map(c => ({
        name: c.full_name.split(' ')[0],
        total_hours: c.total_hours,
        full_name: c.full_name,
    }))

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate('/epics')}
                        className="p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                    >
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-violet-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="badge-purple">{data.epic_key}</span>
                            <span className="text-xs text-tertiary">{data.jira_instance}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-primary">{data.epic_name}</h1>
                    </div>

                    <div className="text-right">
                        <p className="text-3xl font-bold bg-accent bg-clip-text text-transparent">
                            {formatHours(data.total_hours)}
                        </p>
                        <p className="text-tertiary text-sm">{data.contributors.length} contributori</p>
                    </div>
                </div>
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
                    color="purple"
                    icon={
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    }
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Trend Giornaliero" subtitle="Ore registrate sull'iniziativa">
                    <TrendChart data={data.daily_trend} height={280} />
                </ChartCard>

                <ChartCard title="Contributi per Persona" subtitle="Chi ha lavorato sull'iniziativa">
                    <ComparisonBarChart
                        data={contributorChartData}
                        dataKey="total_hours"
                        nameKey="name"
                        height={data.contributors.length * 50 + 50}
                        horizontal
                    />
                </ChartCard>
            </div>

            {/* Contributors */}
            <div>
                <h2 className="text-lg font-semibold text-primary mb-4">Contributori</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.contributors.map((contributor) => (
                        <UserCard
                            key={contributor.email}
                            name={contributor.full_name}
                            email={contributor.email}
                            hours={contributor.total_hours}
                            teamName={contributor.team_name}
                            onClick={() => contributor.user_id && navigate(`/app/users/${contributor.user_id}`)}
                        />
                    ))}
                </div>
            </div>

            {/* Calendario Worklog */}
            <WorklogCalendar
                worklogs={data.worklogs}
            />
        </div>
    )
}
