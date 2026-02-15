import { useMemo } from 'react'

const SIZES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
}

// Generate a consistent color from a string (name/email)
function hashColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 55%, 45%)`
}

function getInitials(firstName, lastName, email) {
    // Try to generate from first/last name
    const first = (firstName || '')[0] || ''
    const last = (lastName || '')[0] || ''
    const nameInitials = (first + last).toUpperCase()

    if (nameInitials) return nameInitials

    // Fallback: generate from email
    if (email) {
        const emailPart = email.split('@')[0]
        const parts = emailPart.split(/[._-]/) // Split by dots, underscores, or hyphens
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase()
        }
        // Fallback: first 2 chars of email
        return emailPart.slice(0, 2).toUpperCase()
    }

    return 'U'
}

export default function UserAvatar({ user, size = 'md' }) {
    const sizeClass = SIZES[size] || SIZES.md
    const initials = useMemo(
        () => getInitials(user?.first_name, user?.last_name, user?.email),
        [user?.first_name, user?.last_name, user?.email]
    )
    const bgColor = useMemo(
        () => hashColor(`${user?.first_name || ''}${user?.last_name || ''}${user?.email || ''}`),
        [user?.first_name, user?.last_name, user?.email]
    )

    if (user?.picture_url) {
        return (
            <img
                src={user.picture_url}
                alt={`${user.first_name || ''} ${user.last_name || ''}`}
                className={`${sizeClass} rounded-full object-cover ring-2 ring-dark-600`}
                referrerPolicy="no-referrer"
            />
        )
    }

    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-dark-600 select-none`}
            style={{ backgroundColor: bgColor }}
        >
            {initials}
        </div>
    )
}
