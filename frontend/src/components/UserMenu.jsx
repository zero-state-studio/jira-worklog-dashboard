import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from './UserAvatar'
import { logout } from '../api/client'

export default function UserMenu() {
    const [open, setOpen] = useState(false)
    const menuRef = useRef(null)
    const navigate = useNavigate()

    // Parse user from localStorage
    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem('user')) || {}
        } catch {
            return {}
        }
    })()

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Utente'

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open])

    // Close on Escape
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') setOpen(false)
        }
        if (open) {
            document.addEventListener('keydown', handleKey)
            return () => document.removeEventListener('keydown', handleKey)
        }
    }, [open])

    async function handleLogout() {
        setOpen(false)
        try {
            await logout()
        } catch {
            // logout() already clears localStorage and redirects, fallback just in case
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
    }

    function handleProfile() {
        setOpen(false)
        navigate('/app/profile')
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-700/50 transition-colors"
            >
                <UserAvatar user={user} size="sm" />
                <span className="text-sm text-dark-200 hidden sm:inline max-w-[120px] truncate">
                    {displayName}
                </span>
                <svg
                    className={`w-4 h-4 text-dark-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-card shadow-xl animate-slide-up z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-dark-600/50">
                        <p className="text-sm font-medium text-dark-100 truncate">{displayName}</p>
                        {user.email && (
                            <p className="text-xs text-dark-400 truncate">{user.email}</p>
                        )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                        <button
                            onClick={handleProfile}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark-200 hover:bg-dark-700/50 transition-colors"
                        >
                            <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Il Mio Profilo
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent-red hover:bg-dark-700/50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Esci
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
