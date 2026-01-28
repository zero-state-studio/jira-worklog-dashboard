import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
    addMonths,
    subMonths
} from 'date-fns'

/**
 * Generate array of dates for calendar grid (includes padding days from prev/next months)
 * Week starts on Monday (weekStartsOn: 1)
 */
export function generateCalendarDays(month) {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })

    return eachDayOfInterval({ start, end })
}

/**
 * Group worklogs by date key (YYYY-MM-DD)
 */
export function groupWorklogsByDate(worklogs) {
    return worklogs.reduce((acc, worklog) => {
        const dateKey = format(new Date(worklog.started), 'yyyy-MM-dd')
        if (!acc[dateKey]) {
            acc[dateKey] = []
        }
        acc[dateKey].push(worklog)
        return acc
    }, {})
}

/**
 * Calculate total hours for each date
 */
export function calculateHoursByDate(worklogsByDate) {
    const hours = {}
    Object.entries(worklogsByDate).forEach(([date, logs]) => {
        hours[date] = logs.reduce((sum, log) => sum + log.time_spent_seconds / 3600, 0)
    })
    return hours
}

/**
 * Get color intensity class based on hours worked
 */
export function getHoursColorIntensity(hours, maxHours) {
    if (hours === 0) return ''

    const ratio = hours / Math.max(maxHours, 8)

    if (ratio >= 0.8) return 'bg-accent-purple/50'
    if (ratio >= 0.6) return 'bg-accent-purple/40'
    if (ratio >= 0.4) return 'bg-accent-purple/30'
    if (ratio >= 0.2) return 'bg-accent-purple/20'
    return 'bg-accent-purple/10'
}

export { format, isSameMonth, isToday, addMonths, subMonths }
