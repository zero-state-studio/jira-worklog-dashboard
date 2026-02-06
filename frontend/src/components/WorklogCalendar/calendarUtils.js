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

/**
 * Calculate hours by date AND instance
 * Returns: { 'YYYY-MM-DD': { instanceName: hours } }
 */
export function calculateHoursByDateAndInstance(worklogsByDate) {
    const result = {}
    Object.entries(worklogsByDate).forEach(([date, logs]) => {
        result[date] = {}
        logs.forEach((log) => {
            const instance = log.jira_instance || 'Unknown'
            result[date][instance] = (result[date][instance] || 0) + log.time_spent_seconds / 3600
        })
    })
    return result
}

/**
 * Color palette for JIRA instances
 */
const INSTANCE_COLORS = [
    { bg: 'bg-accent-blue/70', text: 'text-accent-blue', border: 'border-accent-blue/30', hex: '#60a5fa' },
    { bg: 'bg-accent-purple/70', text: 'text-accent-purple', border: 'border-accent-purple/30', hex: '#a78bfa' },
    { bg: 'bg-accent-green/70', text: 'text-accent-green', border: 'border-accent-green/30', hex: '#34d399' },
    { bg: 'bg-orange-500/70', text: 'text-orange-400', border: 'border-orange-500/30', hex: '#fb923c' },
    { bg: 'bg-pink-500/70', text: 'text-pink-400', border: 'border-pink-500/30', hex: '#f472b6' },
    { bg: 'bg-cyan-500/70', text: 'text-cyan-400', border: 'border-cyan-500/30', hex: '#22d3ee' },
]

/**
 * Get consistent color for a JIRA instance based on its name
 */
export function getInstanceColor(instanceName, allInstances) {
    const sortedInstances = [...allInstances].sort()
    const index = sortedInstances.indexOf(instanceName)
    return INSTANCE_COLORS[index >= 0 ? index % INSTANCE_COLORS.length : 0]
}

/**
 * Extract unique instance names from worklogs
 */
export function getUniqueInstances(worklogs) {
    return [...new Set(worklogs.map(w => w.jira_instance).filter(Boolean))].sort()
}

export { format, isSameMonth, isToday, addMonths, subMonths }

/**
 * Calculate Easter Sunday for a given year (Western)
 */
function getEaster(year) {
    const f = Math.floor
    const G = year % 19
    const C = f(year / 100)
    const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30
    const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11))
    const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7
    const L = I - J
    const month = 3 + f((L + 40) / 44)
    const day = L + 28 - 31 * f(month / 4)
    return { month, day }
}

/**
 * Get holiday name if date is an Italian holiday
 */
export function getHoliday(date) {
    const day = date.getDate()
    const month = date.getMonth() + 1 // 1-indexed
    const year = date.getFullYear()

    // Fixed holidays
    if (day === 1 && month === 1) return 'Capodanno'
    if (day === 6 && month === 1) return 'Epifania'
    if (day === 25 && month === 4) return 'Liberazione'
    if (day === 1 && month === 5) return 'Festa del Lavoro'
    if (day === 2 && month === 6) return 'Festa della Repubblica'
    if (day === 15 && month === 8) return 'Ferragosto'
    if (day === 1 && month === 11) return 'Ognissanti'
    if (day === 8 && month === 12) return 'Immacolata'
    if (day === 25 && month === 12) return 'Natale'
    if (day === 26 && month === 12) return 'Santo Stefano'

    // Easter (Pasqua)
    const easter = getEaster(year)
    if (day === easter.day && month === easter.month) return 'Pasqua'

    // Easter Monday (Pasquetta) - day after Easter
    const easterDate = new Date(year, easter.month - 1, easter.day)
    const pasquettaDate = new Date(easterDate)
    pasquettaDate.setDate(easterDate.getDate() + 1)

    if (day === pasquettaDate.getDate() && month === pasquettaDate.getMonth() + 1) return 'Pasquetta'

    return null
}
