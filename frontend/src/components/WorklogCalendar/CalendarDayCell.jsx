import { format } from 'date-fns'
import { formatHours } from '../../hooks/useData'
import { getHoursColorIntensity, getInstanceColor } from './calendarUtils'

export default function CalendarDayCell({
    date,
    hours,
    maxHours,
    hoursByInstance,
    allInstances,
    isCurrentMonth,
    isToday,
    holiday,
    leaves,
    onClick
}) {
    const hasHours = hours > 0
    const instanceEntries = Object.entries(hoursByInstance || {}).sort((a, b) => b[1] - a[1])
    const hasMultipleInstances = instanceEntries.length > 1
    const hasLeave = leaves && leaves.length > 0
    const approvedLeave = leaves?.find(l => l.status === 'approved')

    return (
        <button
            onClick={hasHours ? onClick : undefined}
            className={`
                relative min-h-[80px] p-2 rounded-lg border transition-all duration-200 flex flex-col items-start justify-between
                ${isCurrentMonth ? (holiday ? 'bg-red-900/10 border-red-900/30' : 'bg-surface border-solid') : 'bg-surface/50 border-dark-800'}
                ${isToday ? 'ring-2 ring-accent-blue' : ''}
                ${hasHours ? 'hover:border-accent-purple/50 cursor-pointer' : 'cursor-default'}
                ${!holiday ? getHoursColorIntensity(hours, maxHours) : ''}
                ${hasLeave && approvedLeave ? 'border-yellow-500/40' : ''}
            `}
        >
            <div className="flex justify-between w-full">
                {/* Day Number */}
                <span className={`
                    text-sm font-medium
                    ${isCurrentMonth ? (holiday ? 'text-error' : 'text-secondary') : 'text-tertiary'}
                    ${isToday ? 'text-accent-blue font-bold' : ''}
                `}>
                    {format(date, 'd')}
                </span>

                {/* Holiday Label (Desktop) */}
                {holiday && (
                    <span className="hidden sm:block text-[10px] font-medium text-error uppercase tracking-wider truncate max-w-[80px]" title={holiday}>
                        {holiday}
                    </span>
                )}
            </div>

            {/* Holiday Dot (Mobile) */}
            {holiday && (
                <div className="sm:hidden absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-400" />
            )}

            {/* Leave Indicator */}
            {hasLeave && (
                <div className="absolute top-1 right-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/30 text-yellow-300 font-medium">
                        {approvedLeave ? approvedLeave.leave_type_name.slice(0, 4).toUpperCase() : 'PEND'}
                    </span>
                </div>
            )}

            {/* Instance color bars + total hours */}
            {hasHours && (
                <div className="w-full mt-auto">
                    {/* Instance mini-bars (only if multiple instances) */}
                    {hasMultipleInstances && (
                        <div className="flex gap-0.5 mb-1">
                            {instanceEntries.map(([instanceName, instHours]) => {
                                const color = getInstanceColor(instanceName, allInstances)
                                const widthPercent = (instHours / hours) * 100
                                return (
                                    <div
                                        key={instanceName}
                                        className={`h-1.5 rounded-full ${color.bg}`}
                                        style={{ width: `${widthPercent}%` }}
                                        title={`${instanceName}: ${formatHours(instHours)}`}
                                    />
                                )
                            })}
                        </div>
                    )}
                    {/* Total hours badge */}
                    <div className="flex justify-end">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent-purple/30 text-accent-purple">
                            {formatHours(hours)}
                        </span>
                    </div>
                </div>
            )}
        </button>
    )
}
