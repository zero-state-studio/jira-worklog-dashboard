import { format } from 'date-fns'
import { formatHours } from '../../hooks/useData'
import { getHoursColorIntensity } from './calendarUtils'

export default function CalendarDayCell({
    date,
    hours,
    maxHours,
    isCurrentMonth,
    isToday,
    onClick
}) {
    const hasHours = hours > 0

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

            {/* Hours Badge */}
            {hasHours && (
                <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-accent-purple/30 text-accent-purple">
                        {formatHours(hours)}
                    </span>
                </div>
            )}
        </button>
    )
}
