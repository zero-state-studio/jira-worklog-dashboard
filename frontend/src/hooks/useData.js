import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for fetching data with loading and error states.
 * @param {Function} fetchFn - Async function that returns data
 * @param {Array} deps - Dependencies array for re-fetching
 */
export function useFetch(fetchFn, deps = []) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const execute = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await fetchFn()
            setData(result)
        } catch (err) {
            setError(err.message || 'An error occurred')
            console.error('Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [fetchFn])

    useEffect(() => {
        execute()
    }, deps)

    return { data, loading, error, refetch: execute }
}

/**
 * Custom hook for managing date range
 */
export function useDateRange(initialStart, initialEnd) {
    const [startDate, setStartDate] = useState(initialStart)
    const [endDate, setEndDate] = useState(initialEnd)

    const setRange = useCallback((start, end) => {
        setStartDate(start)
        setEndDate(end)
    }, [])

    return {
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        setRange
    }
}

/**
 * Format hours for display
 */
export function formatHours(hours) {
    if (hours === 0) return '0h'
    if (hours < 1) return `${Math.round(hours * 60)}m`
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

/**
 * Format percentage for display
 */
export function formatPercentage(value) {
    return `${Math.round(value)}%`
}

/**
 * Get color based on completion percentage
 */
export function getCompletionColor(percentage) {
    if (percentage >= 90) return 'text-accent-green'
    if (percentage >= 70) return 'text-accent-blue'
    if (percentage >= 50) return 'text-accent-orange'
    return 'text-accent-red'
}

/**
 * Generate gradient colors for charts
 */
export const chartColors = [
    '#667eea', // Primary purple-blue
    '#3fb950', // Green
    '#a371f7', // Purple
    '#58a6ff', // Blue
    '#d29922', // Orange
    '#f85149', // Red
    '#db61a2', // Pink
    '#39c5cf', // Cyan
]
