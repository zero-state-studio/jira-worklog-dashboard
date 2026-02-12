import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, getMultiJiraOverview } from '../api/client'
import { MultiJiraOverview, MultiJiraCharts, ComplementaryComparisons } from '../components/MultiJiraStats'
import { formatHours } from '../hooks/useData'
import { StatCard, ProgressBar, MultiProgressBar, CardSkeleton, ErrorState, EmptyState } from '../components/Cards'

export default function UsersListView({ dateRange, selectedInstance }) {
    const navigate = useNavigate()
    const [users, setUsers] = useState([])
    const [overviewData, setOverviewData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sortField, setSortField] = useState('total_hours')
    const [sortAsc, setSortAsc] = useState(false)
    const [filterTeam, setFilterTeam] = useState('')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getUsers(dateRange.startDate, dateRange.endDate, selectedInstance)
            setUsers(result)

            // Fetch overview if no instance selected
            if (!selectedInstance) {
                try {
                    const overview = await getMultiJiraOverview(dateRange.startDate, dateRange.endDate)
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
    }, [dateRange.startDate, dateRange.endDate, selectedInstance])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return (
            <div className="space-y-6 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardSkeleton count={4} />
                </div>
            </div>
        )
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchData} />
    }

    if (!users || users.length === 0) {
        return (
            <div className="space-y-6 animate-slide-up">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-dark-100">Utenti</h1>
                        <p className="text-dark-400">Panoramica di tutti gli utenti configurati</p>
                    </div>
                </div>
                <div className="glass-card p-8">
                    <EmptyState
                        title="Nessun utente configurato"
                        message="Aggiungi utenti nelle Impostazioni per visualizzare le statistiche."
                        icon={
                            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        }
                        actionLabel="Vai alle Impostazioni"
                        onAction={() => navigate('/app/settings')}
                    />
                </div>
            </div>
        )
    }

    // Teams for filter
    const teams = [...new Set(users.map(u => u.team_name).filter(Boolean))].sort()

    // Filter and sort
    const filteredUsers = users.filter(u => !filterTeam || u.team_name === filterTeam)
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let valA = a[sortField]
        let valB = b[sortField]
        if (typeof valA === 'string') {
            valA = valA.toLowerCase()
            valB = valB.toLowerCase()
        }
        if (sortAsc) return valA > valB ? 1 : -1
        return valA < valB ? 1 : -1
    })

    // Aggregate stats
    const totalHours = users.reduce((sum, u) => sum + u.total_hours, 0)
    const totalExpected = users.reduce((sum, u) => sum + u.expected_hours, 0)
    const avgCompletion = totalExpected > 0 ? (totalHours / totalExpected) * 100 : 0
    const activeUsers = users.filter(u => u.total_hours > 0).length

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc)
        } else {
            setSortField(field)
            setSortAsc(false)
        }
    }

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span className="text-dark-600 ml-1">&#8597;</span>
        return <span className="text-accent-blue ml-1">{sortAsc ? '&#8593;' : '&#8595;'}</span>
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Utenti</h1>
                    <p className="text-dark-400">Panoramica di tutti gli utenti configurati</p>
                </div>
            </div>

            {/* Multi-JIRA Overview & Charts */}
            {overviewData && (
                <div className="space-y-8 mb-8">
                    <MultiJiraOverview overview={overviewData} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MultiJiraCharts overview={overviewData} users={users} />
                    </div>
                </div>
            )}

            {/* Stats Grid - Show only if NOT in Multi-Jira mode */}
            {!overviewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Utenti Totali"
                        value={users.length}
                        subtitle={`${activeUsers} attivi nel periodo`}
                        color="primary"
                        icon={
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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
                        label="Team"
                        value={teams.length}
                        color="purple"
                        icon={
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        }
                    />
                </div>
            )}

            {/* Filter */}
            {teams.length > 1 && (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400">Filtra per team:</span>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilterTeam('')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!filterTeam
                                ? 'bg-accent text-white '
                                : 'text-dark-300 bg-dark-700 hover:bg-dark-600'
                                }`}
                        >
                            Tutti
                        </button>
                        {teams.map(team => (
                            <button
                                key={team}
                                onClick={() => setFilterTeam(team)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterTeam === team
                                    ? 'bg-accent text-white '
                                    : 'text-dark-300 bg-dark-700 hover:bg-dark-600'
                                    }`}
                            >
                                {team}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-dark-600">
                                <th
                                    className="text-left py-3 px-4 text-dark-400 font-medium cursor-pointer hover:text-dark-200 transition-colors"
                                    onClick={() => handleSort('full_name')}
                                >
                                    Utente <SortIcon field="full_name" />
                                </th>
                                <th
                                    className="text-left py-3 px-4 text-dark-400 font-medium cursor-pointer hover:text-dark-200 transition-colors"
                                    onClick={() => handleSort('team_name')}
                                >
                                    Team <SortIcon field="team_name" />
                                </th>
                                <th
                                    className="text-right py-3 px-4 text-dark-400 font-medium cursor-pointer hover:text-dark-200 transition-colors"
                                    onClick={() => handleSort('total_hours')}
                                >
                                    Ore <SortIcon field="total_hours" />
                                </th>
                                <th className="text-center py-3 px-4 text-dark-400 font-medium w-48">
                                    Progresso
                                </th>
                                <th
                                    className="text-right py-3 px-4 text-dark-400 font-medium cursor-pointer hover:text-dark-200 transition-colors"
                                    onClick={() => handleSort('completion_percentage')}
                                >
                                    Completamento <SortIcon field="completion_percentage" />
                                </th>
                                <th
                                    className="text-right py-3 px-4 text-dark-400 font-medium cursor-pointer hover:text-dark-200 transition-colors"
                                    onClick={() => handleSort('initiative_count')}
                                >
                                    Iniziative <SortIcon field="initiative_count" />
                                </th>
                                <th
                                    className="text-right py-3 px-4 text-dark-400 font-medium cursor-pointer hover:text-dark-200 transition-colors"
                                    onClick={() => handleSort('worklog_count')}
                                >
                                    Worklog <SortIcon field="worklog_count" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedUsers.map((user) => {
                                const initials = user.full_name
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)

                                const completionColor = user.completion_percentage >= 90
                                    ? 'text-accent-green'
                                    : user.completion_percentage >= 70
                                        ? 'text-accent-blue'
                                        : user.completion_percentage > 0
                                            ? 'text-accent-orange'
                                            : 'text-dark-500'

                                return (
                                    <tr
                                        key={user.email}
                                        className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/app/users/${encodeURIComponent(user.email)}`)}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white font-medium text-xs">{initials}</span>
                                                </div>
                                                <div>
                                                    <p className="text-dark-100 font-medium">{user.full_name}</p>
                                                    <p className="text-dark-500 text-xs">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            {user.team_name ? (
                                                <span className="badge-blue text-xs">{user.team_name}</span>
                                            ) : (
                                                <span className="text-dark-500 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className="text-dark-100 font-semibold">{formatHours(user.total_hours)}</span>
                                            <span className="text-dark-500 text-xs ml-1">/ {formatHours(user.expected_hours)}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {overviewData && user.hours_by_instance ? (
                                                <MultiProgressBar
                                                    segments={Object.entries(user.hours_by_instance).map(([inst, hours], i) => {
                                                        const instColor = overviewData.instances.find(o => o.instance_name === inst)
                                                            ? ['#667eea', '#3fb950', '#a371f7', '#58a6ff', '#d29922', '#f85149'][
                                                            overviewData.instances.findIndex(o => o.instance_name === inst) % 6
                                                            ]
                                                            : '#888'

                                                        return {
                                                            value: hours,
                                                            color: instColor,
                                                            label: inst
                                                        }
                                                    })}
                                                    max={user.expected_hours}
                                                    size="sm"
                                                />
                                            ) : (
                                                <ProgressBar value={user.total_hours} max={user.expected_hours} size="sm" />
                                            )}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`font-semibold ${completionColor}`}>
                                                {Math.round(user.completion_percentage)}%
                                            </span>
                                        </td>
                                        <td className="text-right py-3 px-4 text-dark-200">
                                            {user.initiative_count}
                                        </td>
                                        <td className="text-right py-3 px-4 text-dark-200">
                                            {user.worklog_count}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Complementary Comparisons (now at the bottom) */}
            {overviewData && (
                <div className="mt-8 pt-8 border-t border-dark-700">
                    <ComplementaryComparisons overview={overviewData} />
                </div>
            )}
        </div>
    )
}
