import { formatHours, getCompletionColor } from '../hooks/useData'
import { useCountUp } from '../hooks/useCountUp'

/**
 * Stat Card - displays a single statistic with optional trend
 */
export function StatCard({ label, value, subtitle, icon, color = 'primary', trend }) {
    const colorClasses = {
        primary: 'bg-accent',
        green: 'bg-success',
        purple: 'bg-accent',
        blue: 'bg-accent',
        orange: 'bg-warning',
    }

    // Extract numeric value and suffix for animation
    const parseValue = (val) => {
        if (typeof val !== 'string') return { number: null, suffix: val }

        // Try to extract number and suffix (e.g., "123.5h" -> number: 123.5, suffix: "h")
        const match = val.match(/^([\d.]+)(.*)$/)
        if (match) {
            const number = parseFloat(match[1])
            const suffix = match[2] || ''
            return { number: isNaN(number) ? null : number, suffix }
        }
        return { number: null, suffix: val }
    }

    const { number, suffix } = parseValue(value)

    // Determine decimal places based on suffix
    const decimals = suffix === 'h' ? 1 : suffix === '%' ? 0 : 0

    // Use count-up animation if value is numeric
    const animatedCount = useCountUp(number || 0, 1000, decimals, number !== null)
    const displayValue = number !== null ? `${animatedCount}${suffix}` : value

    return (
        <div className="stat-card group relative">
            {/* Icon */}
            {icon && (
                <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
                    {icon}
                </div>
            )}

            {/* Label */}
            <p className="stat-label mb-2">{label}</p>

            {/* Value with count-up animation */}
            <p className="stat-value">{displayValue}</p>

            {/* Subtitle / Trend */}
            {subtitle && (
                <p className="text-tertiary text-sm mt-2">{subtitle}</p>
            )}

            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 ${trend >= 0 ? 'text-success' : 'text-error'}`}>
                    <svg className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{Math.abs(trend)}%</span>
                </div>
            )}
        </div>
    )
}

/**
 * Progress Bar - circular or linear progress indicator
 */
export function ProgressBar({ value, max, label, size = 'md' }) {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    }

    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-secondary">{label}</span>
                    <span className="text-sm font-medium text-primary">{formatHours(value)} / {formatHours(max)}</span>
                </div>
            )}
            <div className={`w-full bg-surface-secondary rounded-full ${sizeClasses[size]} overflow-hidden`}>
                <div
                    className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

/**
 * MultiProgressBar - stacked progress bar for multiple segments (e.g. instances)
 */
export function MultiProgressBar({ segments, max, size = 'md' }) {
    // segments: [{ value: number, color: string, label: string }]
    const totalValue = segments.reduce((acc, seg) => acc + seg.value, 0)

    // Ensure we don't exceed 100% width visually if total > max
    // But usually max is expected hours, so total can exceed max.
    // If total > max, we cap the bar at 100% width but maybe show overload?
    // For now, let's normalize everything to max.

    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    }

    return (
        <div className="w-full">
            <div className={`w-full bg-surface-secondary rounded-full ${sizeClasses[size]} overflow-hidden flex`}>
                {segments.map((segment, index) => {
                    const percentage = max > 0 ? (segment.value / max) * 100 : 0
                    if (percentage <= 0) return null
                    return (
                        <div
                            key={index}
                            className="h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full relative group"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: segment.color
                            }}
                            title={`${segment.label}: ${formatHours(segment.value)}`}
                        />
                    )
                })}
            </div>
        </div>
    )
}

/**
 * CircularProgress - ring-style progress indicator
 */
export function CircularProgress({ value, max, size = 120, strokeWidth = 8 }) {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-border"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold ${getCompletionColor(percentage)}`} style={{ fontSize: size / 4 }}>
                    {Math.round(percentage)}%
                </span>
                <span className="text-tertiary text-xs">completamento</span>
            </div>
        </div>
    )
}

/**
 * Team Card - clickable card showing team summary
 */
export function TeamCard({ name, hours, memberCount, onClick }) {
    return (
        <div
            onClick={onClick}
            className="flat-card-hover p-5 animate-slide-up"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <span className="badge-accent">{memberCount} membri</span>
            </div>
            <h3 className="font-semibold text-primary mb-1">{name}</h3>
            <p className="text-2xl font-bold text-primary">
                {formatHours(hours)}
            </p>
        </div>
    )
}

/**
 * User Card - clickable card showing user summary
 */
export function UserCard({ name, email, hours, teamName, onClick }) {
    // Use name or fallback to email
    const displayName = name || email || 'Unknown'

    // Generate initials from display name
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'

    return (
        <div
            onClick={onClick}
            className="flat-card-hover p-4 flex items-center gap-4"
        >
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-primary truncate">{displayName}</h4>
                <p className="text-sm text-secondary truncate">{teamName || email}</p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-primary">{formatHours(hours)}</p>
            </div>
        </div>
    )
}

/**
 * Initiative Card - clickable card showing initiative (Epic, Project, etc.) summary
 */
export function EpicCard({ epicKey, name, hours, contributorCount, jiraInstance, parentType, onClick }) {
    // Badge color based on parent type
    const getBadgeClass = () => {
        switch (parentType) {
            case 'Epic': return 'badge-accent'
            case 'Project': return 'badge-accent'
            default: return 'badge-accent'
        }
    }

    return (
        <div
            onClick={onClick}
            className="flat-card-hover p-4 animate-slide-up"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className={getBadgeClass()}>{epicKey}</span>
                    {parentType && (
                        <span className="text-xs text-tertiary bg-surface-secondary px-2 py-0.5 rounded">
                            {parentType}
                        </span>
                    )}
                </div>
                <span className="text-xs text-tertiary">{jiraInstance}</span>
            </div>
            <h4 className="font-medium text-primary mb-2 line-clamp-2">{name}</h4>
            <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">
                    {formatHours(hours)}
                </span>
                <span className="text-sm text-secondary">
                    {contributorCount} {contributorCount === 1 ? 'contributore' : 'contributori'}
                </span>
            </div>
        </div>
    )
}

/**
 * Loading skeleton for cards
 */
export function CardSkeleton({ count = 1 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="stat-card">
                    {/* Icon skeleton */}
                    <div className="loading-shimmer h-12 w-12 rounded-xl mb-4" />

                    {/* Label skeleton */}
                    <div className="loading-shimmer h-3 w-24 rounded mb-3" />

                    {/* Value skeleton - larger for prominence */}
                    <div className="loading-shimmer h-12 w-32 rounded-lg mb-2" />

                    {/* Subtitle skeleton */}
                    <div className="loading-shimmer h-3 w-20 rounded" />
                </div>
            ))}
        </>
    )
}

/**
 * Enhanced skeleton for chart cards
 */
export function ChartSkeleton({ height = 300 }) {
    return (
        <div className="flat-card p-6">
            {/* Title skeleton */}
            <div className="mb-4">
                <div className="loading-shimmer h-6 w-40 rounded mb-2" />
                <div className="loading-shimmer h-4 w-32 rounded" />
            </div>

            {/* Chart area skeleton - random height bars to simulate chart */}
            <div className="space-y-3" style={{ height }}>
                {[60, 80, 45, 90, 70, 55].map((percentage, i) => (
                    <div
                        key={i}
                        className="loading-shimmer rounded"
                        style={{
                            height: `${percentage}%`,
                            width: '100%'
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

/**
 * Empty state component
 */
export function EmptyState({ title, message, icon, action, actionLabel, onAction }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {icon && (
                <div className="w-16 h-16 rounded-lg bg-surface-secondary flex items-center justify-center mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
            <p className="text-secondary max-w-md">{message}</p>
            {(action || onAction) && (
                <button
                    onClick={onAction || action}
                    className="mt-4 btn-primary"
                >
                    {actionLabel || "Vai"}
                </button>
            )}
        </div>
    )
}

/**
 * Error state component
 */
export function ErrorState({ message, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-lg bg-error-subtle flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Si è verificato un errore</h3>
            <p className="text-secondary mb-4">{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="btn-primary">
                    Riprova
                </button>
            )}
        </div>
    )
}
