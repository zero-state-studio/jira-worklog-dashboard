import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetail, getComplementaryGroups, getFactorialLeaves } from '../api/client'
import MultiJiraSection from '../components/MultiJiraStats'
import { formatHours } from '../hooks/useData'
import { StatCard, ProgressBar, EpicCard, ErrorState, EmptyState } from '../components/Cards'
import { TrendChart, MultiTrendChart, DistributionChart, ChartCard } from '../components/Charts'
import { getInstanceColor } from '../components/WorklogCalendar/calendarUtils'
import WorklogCalendar from '../components/WorklogCalendar'

export default function UserView({ dateRange, selectedInstance }) {
    const { email } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [initiativesOpen, setInitiativesOpen] = useState(false)
    const [compGroups, setCompGroups] = useState([])
    const [leaves, setLeaves] = useState([])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getUserDetail(email, dateRange.startDate, dateRange.endDate, selectedInstance)
            setData(result)

            if (!selectedInstance) {
                try {
                    const groups = await getComplementaryGroups()
                    setCompGroups(groups.groups || [])
                } catch (e) {
                    console.error("Failed to fetch groups", e)
                }
            }

            // Fetch leaves for this user (only approved ones)
            try {
                const leavesData = await getFactorialLeaves(
                    dateRange.startDate,
                    dateRange.endDate,
                    result.user_id || null,
                    'approved'
                )
                setLeaves(leavesData || [])
            } catch (err) {
                console.error('Failed to load leaves:', err)
                setLeaves([])
            }
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

    // Check if data is empty
    const isDataEmpty = data.worklogs.length === 0 && data.total_hours === 0

    // Get initials (needed for empty state too)
    const initials = data.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    if (isDataEmpty) {
        return (
            <div className="space-y-6 animate-fade-in">
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
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun worklog registrato"
                        message="Non ci sono ore registrate per questo utente nel periodo selezionato."
                        icon={
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        actionLabel="Torna indietro"
                        onAction={() => navigate(-1)}
                    />
                </div>
            </div>
        )
    }

    // Calculate completion percentage
    const completionPercentage = data.expected_hours > 0
        ? (data.total_hours / data.expected_hours) * 100
        : 0

    // Transform initiative data for pie chart
    const initiativePieData = data.epics.slice(0, 6).map(e => ({
        name: e.epic_name.length > 15 ? e.epic_name.substring(0, 15) + '...' : e.epic_name,
        value: e.total_hours,
        full_name: e.epic_name,
    }))

    // Compute Multi-Jira Overview if needed
    let overviewData = null
    if (!selectedInstance && data.daily_trend_by_instance) {
        const instanceNames = Object.keys(data.daily_trend_by_instance)
        if (instanceNames.length > 1) {
            // Build instances list
            const instances = instanceNames.map(name => {
                const instanceLogs = data.worklogs.filter(w => w.jira_instance === name)
                const totalHours = instanceLogs.reduce((sum, w) => sum + w.time_spent_seconds / 3600, 0)

                // Calculate expected hours approximation (splitting simply by ratio or just using total expected? 
                // For user view, showing total expected vs instance hours is fine, or we can just hide expected per instance if unknown)
                // Actually, InstanceCard expects 'expected_hours' and 'completion_percentage'.
                // We'll calculate completion based on the ratio of total expected hours * (instance_hours / total_hours)
                // This is an approximation but visually consistent.
                // Use total expected hours for the period as the reference capacity for each instance
                const instanceExpected = data.expected_hours
                const completion = instanceExpected > 0 ? (totalHours / instanceExpected) * 100 : 0

                const uniqueEpics = new Set(instanceLogs.map(w => w.epic_key).filter(Boolean))

                return {
                    instance_name: name,
                    total_hours: totalHours,
                    expected_hours: instanceExpected,
                    completion_percentage: completion,
                    daily_trend: data.daily_trend_by_instance[name],
                    initiative_count: uniqueEpics.size,
                    contributor_count: 1 // It's a single user view
                }
            })

            // Build complementary comparisons
            const comparisons = []
            compGroups.forEach(group => {
                if (group.members.length === 2) {
                    const primary = group.members[0].name
                    const secondary = group.members[1].name
                    const primaryInst = instances.find(i => i.instance_name === primary)
                    const secondaryInst = instances.find(i => i.instance_name === secondary)

                    if (primaryInst && secondaryInst) {
                        // Find discrepancies (same epic, large diff)
                        const discrepancies = []
                        // We need epic hours per instance.
                        const primaryEpics = {}
                        const secondaryEpics = {}

                        data.worklogs.forEach(w => {
                            if (w.jira_instance === primary && w.epic_key) primaryEpics[w.epic_key] = (primaryEpics[w.epic_key] || 0) + w.time_spent_seconds / 3600
                            if (w.jira_instance === secondary && w.epic_key) secondaryEpics[w.epic_key] = (secondaryEpics[w.epic_key] || 0) + w.time_spent_seconds / 3600
                        })

                        const allEpicKeys = new Set([...Object.keys(primaryEpics), ...Object.keys(secondaryEpics)])
                        allEpicKeys.forEach(key => {
                            const p = primaryEpics[key] || 0
                            const s = secondaryEpics[key] || 0
                            const delta = Math.abs(p - s)
                            // Threshold for discrepancy: > 1 hour and > 20% diff
                            if (delta > 1 && (p > 0 || s > 0)) {
                                const max = Math.max(p, s)
                                if (delta / max > 0.2) {
                                    const epicName = data.epics.find(e => e.epic_key === key)?.epic_name || key
                                    discrepancies.push({
                                        initiative_key: key,
                                        initiative_name: epicName,
                                        primary_hours: p,
                                        secondary_hours: s,
                                        delta_hours: delta,
                                        delta_percentage: Math.round((delta / max) * 100)
                                    })
                                }
                            }
                        })

                        discrepancies.sort((a, b) => b.delta_hours - a.delta_hours)

                        comparisons.push({
                            group_name: group.name,
                            primary_instance: primary,
                            secondary_instance: secondary,
                            primary_total_hours: primaryInst.total_hours,
                            secondary_total_hours: secondaryInst.total_hours,
                            discrepancies: discrepancies.slice(0, 5)
                        })
                    }
                }
            })

            overviewData = {
                instances,
                complementary_comparisons: comparisons
            }
        }
    }

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

            {/* Multi-JIRA Stats */}
            {overviewData && (
                <div className="mb-8">
                    <MultiJiraSection overview={overviewData} navigate={navigate} />
                    <div className="h-px bg-dark-700 my-8" />
                </div>
            )}

            {/* Show specific Stats and Charts only if NOT in Multi-Jira mode (or if overviewData is null) */}
            {!overviewData && (
                <>
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
                            {(() => {
                                const byInstance = data.daily_trend_by_instance || {}
                                const instanceNames = Object.keys(byInstance).sort()
                                if (instanceNames.length > 1) {
                                    const series = instanceNames.map(name => ({
                                        name,
                                        data: byInstance[name],
                                        color: getInstanceColor(name, instanceNames).hex
                                    }))
                                    return <MultiTrendChart series={series} height={280} />
                                }
                                return <TrendChart data={data.daily_trend} height={280} />
                            })()}
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
                </>
            )}

            {/* Initiative Cards */}
            {data.epics.length > 0 && (
                <div className="glass-card p-4">
                    <button
                        onClick={() => setInitiativesOpen(!initiativesOpen)}
                        className="flex items-center justify-between w-full group focus:outline-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-dark-700 group-hover:bg-dark-600 transition-colors ${initiativesOpen ? 'text-accent-blue' : 'text-dark-400'}`}>
                                <svg
                                    className={`w-6 h-6 transition-transform duration-200 ${initiativesOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-dark-100 group-hover:text-accent-blue transition-colors">Iniziative Lavorate</h2>
                                <p className="text-sm text-dark-400 text-left">
                                    {data.epics.length} iniziativ{data.epics.length === 1 ? 'a' : 'e'} lavorat{data.epics.length === 1 ? 'a' : 'e'} nel periodo
                                </p>
                            </div>
                        </div>
                    </button>

                    {initiativesOpen && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up mt-6 pt-4 border-t border-dark-700">
                            {data.epics.map((epic) => (
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
                    )}
                </div>
            )}

            {/* Calendario Worklog */}
            <div>
                <h2 className="text-lg font-semibold text-dark-100 mb-4 px-1">Calendario</h2>
                <WorklogCalendar
                    worklogs={data.worklogs}
                    leaves={leaves}
                    onUserClick={(email) => navigate(`/app/users/${encodeURIComponent(email)}`)}
                />
            </div>
        </div>
    )
}
