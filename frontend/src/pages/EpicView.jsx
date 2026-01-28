import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getEpics, getEpicDetail } from '../api/client'
import { formatHours } from '../hooks/useData'
import { EpicCard, UserCard, StatCard, ErrorState, CardSkeleton, EmptyState } from '../components/Cards'
import { TrendChart, ComparisonBarChart, ChartCard } from '../components/Charts'
import WorklogCalendar from '../components/WorklogCalendar'

export default function EpicView({ dateRange, selectedInstance }) {
    const { epicKey } = useParams()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [listData, setListData] = useState(null)
    const [detailData, setDetailData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Get type filter from URL
    const typeFilter = searchParams.get('type') || 'all'

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
                // Fetch epic list
                const result = await getEpics(dateRange.startDate, dateRange.endDate, selectedInstance)
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
            <div className="space-y-6 animate-fade-in">
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

    // Epic List View
    if (listData) {
        // Count by type
        const projectCount = listData.epics.filter(e => e.parent_type === 'Project').length
        const epicCount = listData.epics.filter(e => e.parent_type === 'Epic').length

        // Filter epics based on selected type
        const filteredEpics = typeFilter === 'all'
            ? listData.epics
            : listData.epics.filter(epic => epic.parent_type === typeFilter)

        // Calculate filtered hours
        const filteredHours = filteredEpics.reduce((sum, e) => sum + e.total_hours, 0)

        const setTypeFilter = (type) => {
            if (type === 'all') {
                setSearchParams({})
            } else {
                setSearchParams({ type })
            }
        }

        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-dark-100">Iniziative</h1>
                            <p className="text-dark-400">
                                {filteredEpics.length} iniziative con ore registrate nel periodo
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                                {formatHours(filteredHours)}
                            </p>
                            <p className="text-dark-400 text-sm">ore totali</p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setTypeFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                typeFilter === 'all'
                                    ? 'bg-gradient-primary text-white shadow-glow'
                                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700 bg-dark-800'
                            }`}
                        >
                            Tutti ({listData.epics.length})
                        </button>
                        {projectCount > 0 && (
                            <button
                                onClick={() => setTypeFilter('Project')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    typeFilter === 'Project'
                                        ? 'bg-accent-blue text-white'
                                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700 bg-dark-800'
                                }`}
                            >
                                Projects ({projectCount})
                            </button>
                        )}
                        {epicCount > 0 && (
                            <button
                                onClick={() => setTypeFilter('Epic')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    typeFilter === 'Epic'
                                        ? 'bg-accent-purple text-white'
                                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700 bg-dark-800'
                                }`}
                            >
                                Epics ({epicCount})
                            </button>
                        )}
                    </div>
                </div>

                {/* Epic Cards Grid */}
                {filteredEpics.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredEpics.map((epic) => (
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
                ) : (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-dark-200 mb-2">Nessuna Iniziativa</h3>
                        <p className="text-dark-400">Non ci sono iniziative con ore registrate nel periodo selezionato</p>
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
            <div className="space-y-6 animate-fade-in">
                <div className="glass-card p-6">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => navigate('/epics')}
                            className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                        >
                            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="badge-purple">{data.epic_key}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-dark-100">{data.epic_name}</h1>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun worklog registrato"
                        message="Non ci sono ore registrate per questa iniziativa nel periodo selezionato."
                        icon={
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate('/epics')}
                        className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                    >
                        <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <span className="text-xs text-dark-500">{data.jira_instance}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-dark-100">{data.epic_name}</h1>
                    </div>

                    <div className="text-right">
                        <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                            {formatHours(data.total_hours)}
                        </p>
                        <p className="text-dark-400 text-sm">{data.contributors.length} contributori</p>
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
                <h2 className="text-lg font-semibold text-dark-100 mb-4">Contributori</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.contributors.map((contributor) => (
                        <UserCard
                            key={contributor.email}
                            name={contributor.full_name}
                            email={contributor.email}
                            hours={contributor.total_hours}
                            teamName={contributor.team_name}
                            onClick={() => navigate(`/users/${encodeURIComponent(contributor.email)}`)}
                        />
                    ))}
                </div>
            </div>

            {/* Calendario Worklog */}
            <WorklogCalendar
                worklogs={data.worklogs}
                onUserClick={(email) => navigate(`/users/${encodeURIComponent(email)}`)}
            />
        </div>
    )
}
