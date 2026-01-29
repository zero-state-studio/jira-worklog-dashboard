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
    onClick
}) {
    const hasHours = hours > 0
    const instanceEntries = Object.entries(hoursByInstance || {}).sort((a, b) => b[1] - a[1])
    const hasMultipleInstances = instanceEntries.length > 1

    return (
        <button
            onClick={hasHours ? onClick : undefined}
            className={`
                relative min-h-[80px] p-2 rounded-lg border transition-all duration-200
                ${isCurrentMonth ? 'bg-dark-800 border-dark-700' : 'bg-dark-900/50 border-dark-800'}
                ${isToday ? 'ring-2 ring-accent-blue' : ''}
                ${hasHours ? 'hover:border-accent-purple/50 cursor-pointer' : 'cursor-default'}
                ${getHoursColorIntensity(hours, maxHours)}
            `}
        >
            {/* Day Number */}
            <span className={`
                text-sm font-medium
                ${isCurrentMonth ? 'text-dark-200' : 'text-dark-500'}
                ${isToday ? 'text-accent-blue font-bold' : ''}
            `}>
                {format(date, 'd')}
            </span>

            {/* Instance color bars + total hours */}
            {hasHours && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
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
