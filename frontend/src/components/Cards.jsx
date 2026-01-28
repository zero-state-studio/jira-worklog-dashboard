import { formatHours, getCompletionColor } from '../hooks/useData'

/**
 * Stat Card - displays a single statistic with optional trend
 */
export function StatCard({ label, value, subtitle, icon, color = 'primary', trend }) {
    const colorClasses = {
        primary: 'from-primary-from to-primary-to',
        green: 'from-accent-green to-emerald-600',
        purple: 'from-accent-purple to-violet-600',
        blue: 'from-accent-blue to-blue-600',
        orange: 'from-accent-orange to-amber-600',
    }

    return (
        <div className="stat-card group">
            {/* Background glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5 group-hover:opacity-10 transition-opacity rounded-xl`} />

            {/* Icon */}
            {icon && (
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 shadow-glow`}>
                    {icon}
                </div>
            )}

            {/* Label */}
            <p className="stat-label mb-2">{label}</p>

            {/* Value */}
            <p className="stat-value text-4xl">{value}</p>

            {/* Subtitle / Trend */}
            {subtitle && (
                <p className="text-dark-400 text-sm mt-2">{subtitle}</p>
            )}

            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 ${trend >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
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
                    <span className="text-sm text-dark-300">{label}</span>
                    <span className="text-sm font-medium text-dark-200">{formatHours(value)} / {formatHours(max)}</span>
                </div>
            )}
            <div className={`w-full bg-dark-700 rounded-full ${sizeClasses[size]} overflow-hidden`}>
                <div
                    className="h-full bg-gradient-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
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
                    className="text-dark-700"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                />
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold ${getCompletionColor(percentage)}`} style={{ fontSize: size / 4 }}>
                    {Math.round(percentage)}%
                </span>
                <span className="text-dark-400 text-xs">completamento</span>
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
            className="glass-card-hover p-5 animate-slide-up"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <span className="badge-blue">{memberCount} membri</span>
            </div>
            <h3 className="font-semibold text-dark-100 mb-1">{name}</h3>
            <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
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
            className="glass-card-hover p-4 flex items-center gap-4"
        >
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-dark-100 truncate">{displayName}</h4>
                <p className="text-sm text-dark-400 truncate">{teamName || email}</p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-dark-100">{formatHours(hours)}</p>
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
            case 'Epic': return 'badge-purple'
            case 'Project': return 'badge-blue'
            default: return 'badge-purple'
        }
    }

    return (
        <div
            onClick={onClick}
            className="glass-card-hover p-4 animate-slide-up"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className={getBadgeClass()}>{epicKey}</span>
                    {parentType && (
                        <span className="text-xs text-dark-500 bg-dark-700 px-2 py-0.5 rounded">
                            {parentType}
                        </span>
                    )}
                </div>
                <span className="text-xs text-dark-500">{jiraInstance}</span>
            </div>
            <h4 className="font-medium text-dark-100 mb-2 line-clamp-2">{name}</h4>
            <div className="flex items-center justify-between">
                <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {formatHours(hours)}
                </span>
                <span className="text-sm text-dark-400">
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
                <div key={i} className="glass-card p-5">
                    <div className="loading-shimmer h-10 w-10 rounded-lg mb-4" />
                    <div className="loading-shimmer h-4 w-1/2 rounded mb-2" />
                    <div className="loading-shimmer h-8 w-3/4 rounded" />
                </div>
            ))}
        </>
    )
}

/**
 * Empty state component
 */
export function EmptyState({ title, message, icon }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {icon && (
                <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
            <p className="text-dark-400 max-w-md">{message}</p>
        </div>
    )
}

/**
 * Error state component
 */
export function ErrorState({ message, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-red/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-dark-200 mb-2">Si è verificato un errore</h3>
            <p className="text-dark-400 mb-4">{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="btn-primary">
                    Riprova
                </button>
            )}
        </div>
    )
}
