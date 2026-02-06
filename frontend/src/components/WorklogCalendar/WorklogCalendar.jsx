import { useState, useMemo } from 'react'
import { it } from 'date-fns/locale'
import CalendarDayCell from './CalendarDayCell'
import WorklogDrawer from './WorklogDrawer'
import {
    generateCalendarDays,
    groupWorklogsByDate,
    calculateHoursByDate,
    calculateHoursByDateAndInstance,
    getUniqueInstances,
    format,
    isSameMonth,
    isToday,
    addMonths,
    subMonths,
    getHoliday
} from './calendarUtils'

const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
)

const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
)

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function WorklogCalendar({ worklogs, onIssueClick }) {
    // Default to current month, or month of most recent worklog
    const getInitialMonth = () => {
        if (worklogs.length > 0) {
            const dates = worklogs.map(w => new Date(w.started))
            const mostRecent = new Date(Math.max(...dates))
            return mostRecent
        }
        return new Date()
    }

    const [currentMonth, setCurrentMonth] = useState(getInitialMonth)
    const [selectedDate, setSelectedDate] = useState(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // Group worklogs by date
    const worklogsByDate = useMemo(() => {
        return groupWorklogsByDate(worklogs)
    }, [worklogs])

    // Calculate hours per day
    const hoursByDate = useMemo(() => {
        return calculateHoursByDate(worklogsByDate)
    }, [worklogsByDate])

    // Calculate hours per day per instance
    const hoursByDateAndInstance = useMemo(() => {
        return calculateHoursByDateAndInstance(worklogsByDate)
    }, [worklogsByDate])

    // Get unique instances for color assignment
    const allInstances = useMemo(() => {
        return getUniqueInstances(worklogs)
    }, [worklogs])

    // Generate calendar days for current month view
    const calendarDays = useMemo(() => {
        return generateCalendarDays(currentMonth)
    }, [currentMonth])

    // Calculate max hours for color intensity scaling
    const maxHoursInMonth = useMemo(() => {
        const monthDays = calendarDays.filter(d => isSameMonth(d, currentMonth))
        const hoursInMonth = monthDays.map(d => {
            const dateKey = format(d, 'yyyy-MM-dd')
            return hoursByDate[dateKey] || 0
        })
        return Math.max(...hoursInMonth, 8)
    }, [calendarDays, currentMonth, hoursByDate])

    // Navigation handlers
    const goToPreviousMonth = () => {
        setCurrentMonth(prev => subMonths(prev, 1))
    }

    const goToNextMonth = () => {
        setCurrentMonth(prev => addMonths(prev, 1))
    }

    // Day click handler
    const handleDayClick = (day) => {
        setSelectedDate(day)
        setIsDrawerOpen(true)
    }

    // Get worklogs for selected date
    const selectedDateWorklogs = useMemo(() => {
        if (!selectedDate) return []
        const dateKey = format(selectedDate, 'yyyy-MM-dd')
        return worklogsByDate[dateKey] || []
    }, [selectedDate, worklogsByDate])

    return (
        <div className="space-y-4">
            {/* Month Navigation Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-100 transition-colors"
                >
                    <ChevronLeftIcon />
                </button>
                <h2 className="text-lg font-semibold text-dark-100 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </h2>
                <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-100 transition-colors"
                >
                    <ChevronRightIcon />
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(day => (
                    <div
                        key={day}
                        className="text-center text-dark-400 text-sm font-medium py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const hours = hoursByDate[dateKey] || 0
                    const holiday = getHoliday(day)

                    return (
                        <CalendarDayCell
                            key={dateKey}
                            date={day}
                            hours={hours}
                            maxHours={maxHoursInMonth}
                            hoursByInstance={hoursByDateAndInstance[dateKey] || {}}
                            allInstances={allInstances}
                            isCurrentMonth={isSameMonth(day, currentMonth)}
                            isToday={isToday(day)}
                            holiday={holiday}
                            onClick={() => handleDayClick(day)}
                        />
                    )
                })}
            </div>

            {/* Side Drawer */}
            <WorklogDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                date={selectedDate}
                worklogs={selectedDateWorklogs}
                allInstances={allInstances}
                onIssueClick={onIssueClick}
            />
        </div>
    )
}
