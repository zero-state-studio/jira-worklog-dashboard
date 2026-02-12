import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers } from '../api/client'
import { KpiBar, DataTable, Badge } from '../components/common'
import { formatHours } from '../hooks/useData'
import { Users as UsersIcon } from 'lucide-react'

export default function UsersListView({ dateRange, selectedInstance }) {
    const navigate = useNavigate()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getUsers(dateRange.startDate, dateRange.endDate, selectedInstance)
            setUsers(result)
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
            <div className="space-y-6">
                <div className="h-20 bg-surface-secondary rounded-lg animate-pulse" />
                <div className="h-96 bg-surface-secondary rounded-lg animate-pulse" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-error font-semibold mb-2">Error loading users</p>
                    <p className="text-secondary mb-4">{error}</p>
                    <button onClick={fetchData} className="btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    if (!users || users.length === 0) {
        return (
            <div className="space-y-6">
                {/* Breadcrumb */}
                <div className="text-xs text-tertiary">
                    App / Users
                </div>

                {/* Header */}
                <div>
                    <h1 className="text-xl font-semibold text-primary mb-1">Users</h1>
                </div>

                <div className="border border-solid rounded-lg bg-surface p-12 text-center">
                    <UsersIcon className="w-12 h-12 mx-auto text-tertiary mb-3" />
                    <p className="text-sm text-secondary">No users configured</p>
                    <button
                        onClick={() => navigate('/app/settings')}
                        className="mt-4 px-4 py-2 bg-accent text-inverse rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        )
    }

    // Calculate KPIs
    const totalHours = users.reduce((sum, u) => sum + u.total_hours, 0)
    const totalExpected = users.reduce((sum, u) => sum + u.expected_hours, 0)
    const activeUsers = users.filter(u => u.total_hours > 0).length
    const avgHoursPerUser = users.length > 0 ? totalHours / users.length : 0

    const kpiItems = [
        {
            label: 'Total Users',
            value: users.length,
        },
        {
            label: 'Total Hours',
            value: formatHours(totalHours),
        },
        {
            label: 'Avg Hours/User',
            value: formatHours(avgHoursPerUser),
        },
        {
            label: 'Active Users',
            value: activeUsers,
        },
    ]

    // Prepare table data
    const tableColumns = [
        {
            key: 'user',
            label: 'User',
            type: 'text',
            sortable: true,
            render: (_, row) => {
                const initials = row.full_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                return (
                    <button
                        onClick={() => navigate(`/app/users/${row.id}`)}
                        className="flex items-center gap-3 text-left w-full hover:opacity-80 transition-opacity"
                    >
                        <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
                            <span className="text-accent-text font-medium text-xs">{initials}</span>
                        </div>
                        <div>
                            <p className="text-sm text-primary font-medium">{row.full_name}</p>
                            <p className="text-xs text-tertiary">{row.email}</p>
                        </div>
                    </button>
                )
            },
        },
        {
            key: 'team_name',
            label: 'Team',
            type: 'text',
            sortable: true,
            width: '150px',
            render: (value) =>
                value ? (
                    <Badge variant="default">{value}</Badge>
                ) : (
                    <span className="text-tertiary text-xs">-</span>
                ),
        },
        {
            key: 'total_hours',
            label: 'Hours',
            type: 'text',
            sortable: true,
            width: '150px',
            render: (value, row) => {
                const percentage = row.expected_hours > 0 ? (value / row.expected_hours) * 100 : 0
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary">
                            {formatHours(value)}
                        </span>
                        {row.expected_hours > 0 && (
                            <>
                                <span className="text-tertiary text-xs">/</span>
                                <span className="font-mono text-xs text-tertiary">
                                    {formatHours(row.expected_hours)}
                                </span>
                                {/* Mini progress bar */}
                                <div className="w-20 h-1 bg-surface-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent rounded-full transition-all"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )
            },
        },
        {
            key: 'worklog_count',
            label: 'Worklogs',
            type: 'number',
            sortable: true,
            width: '100px',
            render: (value) => <span className="font-mono text-xs">{value}</span>,
        },
        {
            key: 'completion_percentage',
            label: 'Completion',
            type: 'text',
            sortable: true,
            width: '120px',
            render: (value) => {
                const color =
                    value >= 90
                        ? 'text-success'
                        : value >= 70
                        ? 'text-accent'
                        : value > 0
                        ? 'text-warning'
                        : 'text-tertiary'
                return <span className={`font-mono text-xs font-medium ${color}`}>{Math.round(value)}%</span>
            },
        },
    ]

    const tableData = users.map((user) => ({
        id: user.id,
        user: user.full_name,
        full_name: user.full_name,
        email: user.email,
        team_name: user.team_name,
        total_hours: user.total_hours,
        expected_hours: user.expected_hours,
        worklog_count: user.worklog_count || 0,
        completion_percentage: user.completion_percentage || 0,
    }))

    return (
        <div className="space-y-6 max-w-[1920px]">
            {/* Breadcrumb */}
            <div className="text-xs text-tertiary">
                App / Users
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-primary mb-1">Users</h1>
                </div>
            </div>

            {/* KPI Bar */}
            <KpiBar items={kpiItems} />

            {/* Users Table */}
            <DataTable
                columns={tableColumns}
                data={tableData}
                sortable
                toolbar={{
                    title: 'Users',
                }}
            />
        </div>
    )
}
