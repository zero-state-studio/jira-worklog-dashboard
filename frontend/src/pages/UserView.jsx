import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Target, FileText, ChevronDown } from 'lucide-react'
import { getUserDetail, getComplementaryGroups, getFactorialLeaves } from '../api/client'
import { Card, Badge, Button, KpiBar } from '../components/common'
import MultiJiraSection from '../components/MultiJiraStats'
import { formatHours } from '../hooks/useData'
import { TrendChart, MultiTrendChart, DistributionChart } from '../components/Charts'
import { getInstanceColor } from '../components/WorklogCalendar/calendarUtils'
import WorklogCalendar from '../components/WorklogCalendar'

export default function UserView({ dateRange, selectedInstance }) {
    const { userId } = useParams()
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
            const result = await getUserDetail(parseInt(userId), dateRange.startDate, dateRange.endDate, selectedInstance)
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
    }, [userId, dateRange.startDate, dateRange.endDate, selectedInstance])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6">
                <Card>
                    <div className="h-20 bg-surface-secondary rounded animate-pulse" />
                </Card>
                <Card>
                    <div className="h-32 bg-surface-secondary rounded animate-pulse" />
                </Card>
                <div className="grid grid-cols-2 gap-6">
                    <Card>
                        <div className="h-64 bg-surface-secondary rounded animate-pulse" />
                    </Card>
                    <Card>
                        <div className="h-64 bg-surface-secondary rounded animate-pulse" />
                    </Card>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-error font-medium mb-2">Errore durante il caricamento</p>
                    <p className="text-secondary mb-4">{error}</p>
                    <Button onClick={fetchData}>Riprova</Button>
                </div>
            </Card>
        )
    }

    if (!data) return null

    // Check if data is empty
    const isDataEmpty = data.worklogs.length === 0 && data.total_hours === 0

    // Get initials
    const initials = data.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    if (isDataEmpty) {
        return (
            <div className="space-y-6">
                <Card>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="flex-shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
                            <span className="text-accent-text font-semibold text-sm">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-semibold text-primary truncate">{data.full_name}</h1>
                            <p className="text-sm text-tertiary truncate">{data.email}</p>
                        </div>
                        {data.team_name && (
                            <Badge variant="info">{data.team_name}</Badge>
                        )}
                    </div>
                </Card>
                <Card>
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-surface-secondary mx-auto mb-4 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-tertiary" />
                        </div>
                        <p className="text-primary font-medium mb-1">Nessun worklog registrato</p>
                        <p className="text-sm text-secondary mb-6">Non ci sono ore registrate per questo utente nel periodo selezionato.</p>
                        <Button onClick={() => navigate(-1)}>Torna indietro</Button>
                    </div>
                </Card>
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
                    contributor_count: 1
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
                        const discrepancies = []
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

    // KPI data
    const kpiData = [
        {
            label: 'Ore totali',
            value: formatHours(data.total_hours),
            subtitle: `su ${formatHours(data.expected_hours)} previste`,
            variant: 'default'
        },
        {
            label: 'Completamento',
            value: `${Math.round(completionPercentage)}%`,
            variant: completionPercentage >= 90 ? 'success' : completionPercentage >= 70 ? 'default' : 'warning'
        },
        {
            label: 'Iniziative',
            value: data.epics.length.toString(),
            variant: 'default'
        },
        {
            label: 'Worklogs',
            value: data.worklogs.length.toString(),
            variant: 'default'
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
                        <span className="text-accent-text font-semibold text-sm">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold text-primary truncate">{data.full_name}</h1>
                        <p className="text-sm text-tertiary truncate">{data.email}</p>
                    </div>
                    {data.team_name && (
                        <Badge variant="info">{data.team_name}</Badge>
                    )}
                </div>
            </Card>

            {/* KPI Bar */}
            <KpiBar items={kpiData} />

            {/* Multi-JIRA Stats */}
            {overviewData && (
                <div>
                    <MultiJiraSection overview={overviewData} navigate={navigate} />
                </div>
            )}

            {/* Charts - Only show if NOT in Multi-Jira mode */}
            {!overviewData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-primary">Trend Giornaliero</h3>
                            <p className="text-xs text-tertiary">Ore registrate nel periodo</p>
                        </div>
                        {(() => {
                            const byInstance = data.daily_trend_by_instance || {}
                            const instanceNames = Object.keys(byInstance).sort()
                            if (instanceNames.length > 1) {
                                const series = instanceNames.map(name => ({
                                    name,
                                    data: byInstance[name],
                                    color: getInstanceColor(name, instanceNames).hex
                                }))
                                return <MultiTrendChart series={series} height={240} />
                            }
                            return <TrendChart data={data.daily_trend} height={240} />
                        })()}
                    </Card>

                    <Card>
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-primary">Distribuzione Iniziative</h3>
                            <p className="text-xs text-tertiary">Come sono distribuite le ore</p>
                        </div>
                        {initiativePieData.length > 0 ? (
                            <DistributionChart data={initiativePieData} height={240} />
                        ) : (
                            <div className="h-60 flex items-center justify-center">
                                <p className="text-sm text-tertiary">Nessuna iniziativa nel periodo</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Initiative Cards */}
            {data.epics.length > 0 && (
                <Card>
                    <button
                        onClick={() => setInitiativesOpen(!initiativesOpen)}
                        className="flex items-center justify-between w-full group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-surface-secondary flex items-center justify-center group-hover:bg-surface-tertiary transition-colors">
                                <ChevronDown
                                    className={`w-4 h-4 text-secondary transition-transform duration-200 ${initiativesOpen ? 'rotate-180' : ''}`}
                                />
                            </div>
                            <div className="text-left">
                                <h2 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                                    Iniziative Lavorate
                                </h2>
                                <p className="text-xs text-tertiary">
                                    {data.epics.length} iniziativ{data.epics.length === 1 ? 'a' : 'e'} nel periodo
                                </p>
                            </div>
                        </div>
                    </button>

                    {initiativesOpen && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                            {data.epics.map((epic) => (
                                <button
                                    key={epic.epic_key}
                                    onClick={() => navigate(`/app/epics/${encodeURIComponent(epic.epic_key)}`)}
                                    className="p-3 rounded-lg border border-border bg-surface hover:border-accent transition-colors text-left"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="text-xs font-mono text-secondary">{epic.epic_key}</p>
                                        {epic.jira_instance && (
                                            <Badge variant="outline" className="text-xs">
                                                {epic.jira_instance}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-primary mb-2 line-clamp-2">
                                        {epic.epic_name}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-mono font-semibold text-accent">
                                            {formatHours(epic.total_hours)}
                                        </p>
                                        {epic.contributor_count > 1 && (
                                            <p className="text-xs text-tertiary">
                                                {epic.contributor_count} contributors
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Calendario Worklog */}
            <div>
                <h2 className="text-sm font-semibold text-primary mb-4">Calendario</h2>
                <WorklogCalendar
                    worklogs={data.worklogs}
                    leaves={leaves}
                />
            </div>
        </div>
    )
}
