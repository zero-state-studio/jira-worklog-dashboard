import { useMemo } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatHours } from '../../hooks/useData'
import { getInstanceColor } from './calendarUtils'

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

const UserIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
)

const ClockIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

function WorklogItem({ worklog, onIssueClick }) {
    return (
        <div className="glass-card p-4 space-y-2">
            <div className="flex items-start justify-between">
                <button
                    onClick={() => onIssueClick && onIssueClick(worklog.issue_key)}
                    className="badge-purple hover:bg-accent-purple/30 transition-colors"
                >
                    {worklog.issue_key}
                </button>
                <span className="text-dark-100 font-semibold">
                    {formatHours(worklog.time_spent_seconds / 3600)}
                </span>
            </div>
            <p className="text-dark-200 text-sm line-clamp-2">
                {worklog.issue_summary}
            </p>
            <div className="flex items-center gap-4 text-dark-400 text-xs">
                <div className="flex items-center gap-1">
                    <UserIcon />
                    <span>{worklog.author_display_name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <ClockIcon />
                    <span>{format(new Date(worklog.started), 'HH:mm', { locale: it })}</span>
                </div>
            </div>
        </div>
    )
}

export default function WorklogDrawer({
    isOpen,
    onClose,
    date,
    worklogs,
    leaves,
    allInstances,
    onIssueClick
}) {
    if (!isOpen || !date) return null

    const totalHours = worklogs.reduce((sum, w) => sum + w.time_spent_seconds / 3600, 0)
    const hasMultipleInstances = allInstances && allInstances.length > 1
    const hasLeaves = leaves && leaves.length > 0

    // Group worklogs by instance
    const groupedWorklogs = useMemo(() => {
        if (!hasMultipleInstances) return null

        const groups = {}
        worklogs.forEach(w => {
            const instance = w.jira_instance || 'Unknown'
            if (!groups[instance]) groups[instance] = []
            groups[instance].push(w)
        })

        // Sort each group by started desc
        Object.values(groups).forEach(group => {
            group.sort((a, b) => new Date(b.started) - new Date(a.started))
        })

        return groups
    }, [worklogs, hasMultipleInstances])

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="relative w-full max-w-md bg-dark-800 border-l border-dark-700 shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-dark-100">
                            {format(date, 'EEEE d MMMM yyyy', { locale: it })}
                        </h2>
                        <p className="text-dark-400 mt-1">
                            {worklogs.length} registrazioni - {formatHours(totalHours)} totali
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-100 transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Leaves Section */}
                {hasLeaves && (
                    <div className="px-6 pt-6 pb-0">
                        <div className="p-4 bg-yellow-900/10 border border-yellow-500/30 rounded-lg">
                            <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                                Ferie/Permessi
                            </h4>
                            {leaves.map(leave => (
                                <div key={leave.id} className="text-sm text-yellow-300 mb-1">
                                    <span className="font-medium">{leave.leave_type_name}</span>
                                    {leave.status !== 'approved' && (
                                        <span className="ml-2 text-xs text-yellow-500">
                                            ({leave.status})
                                        </span>
                                    )}
                                    {leave.half_day !== 'no' && (
                                        <span className="ml-2 text-xs">
                                            (mezza giornata)
                                        </span>
                                    )}
                                    {leave.description && (
                                        <div className="text-xs text-yellow-400/70 mt-0.5">
                                            {leave.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Worklog List */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {worklogs.length === 0 ? (
                        <div className="text-center text-dark-400 py-8">
                            Nessun worklog in questa data
                        </div>
                    ) : hasMultipleInstances && groupedWorklogs ? (
                        /* Grouped by instance */
                        Object.entries(groupedWorklogs).map(([instanceName, instanceWorklogs]) => {
                            const color = getInstanceColor(instanceName, allInstances)
                            const instanceHours = instanceWorklogs.reduce(
                                (sum, w) => sum + w.time_spent_seconds / 3600, 0
                            )
                            return (
                                <div key={instanceName}>
                                    {/* Instance header */}
                                    <div className={`flex items-center justify-between mb-3 pb-2 border-b ${color.border}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                                            <span className={`text-sm font-semibold ${color.text}`}>
                                                {instanceName}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-medium ${color.text}`}>
                                            {formatHours(instanceHours)}
                                        </span>
                                    </div>
                                    {/* Instance worklogs */}
                                    <div className="space-y-3 mb-5">
                                        {instanceWorklogs.map(worklog => (
                                            <WorklogItem
                                                key={worklog.id}
                                                worklog={worklog}
                                                onIssueClick={onIssueClick}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        /* Flat list (single instance) */
                        worklogs
                            .sort((a, b) => new Date(b.started) - new Date(a.started))
                            .map(worklog => (
                                <WorklogItem
                                    key={worklog.id}
                                    worklog={worklog}
                                    onIssueClick={onIssueClick}
                                />
                            ))
                    )}
                </div>
            </div>
        </div>
    )
}
