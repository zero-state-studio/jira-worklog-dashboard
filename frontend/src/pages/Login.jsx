import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [authConfig, setAuthConfig] = useState(null)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState(null)
    const [email, setEmail] = useState('dev@dev.local')
    const navigate = useNavigate()

    // Check if user is already authenticated
    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (token) {
            // User already logged in, redirect to dashboard
            navigate('/app/dashboard')
        }
    }, [navigate])

    // Fetch auth config on mount to detect dev mode
    useEffect(() => {
        async function loadConfig() {
            try {
                const response = await fetch('http://localhost:8000/api/auth/config')
                const data = await response.json()
                setAuthConfig(data)
            } catch (err) {
                console.error('Failed to load auth config:', err)
                setError('Failed to load authentication configuration')
            }
        }
        loadConfig()
    }, [])

    // Handle OAuth callback with tokens in query params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const accessToken = params.get('access_token')

        if (accessToken) {
            // Save tokens and user data from OAuth callback
            localStorage.setItem('access_token', accessToken)
            localStorage.setItem('refresh_token', params.get('refresh_token'))
            localStorage.setItem('user', params.get('user'))

            // Clean up URL and redirect to dashboard
            window.history.replaceState({}, '', '/login')
            navigate('/app/dashboard')
        }
    }, [navigate])

    // Handle dev login
    async function handleDevLogin() {
        setLoading(true)
        setError(null)

        // Validate email
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('http://localhost:8000/api/auth/dev/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    first_name: email.split('@')[0],
                    last_name: 'User',
                    role: 'ADMIN'
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Login failed: ${response.status}`)
            }

            const data = await response.json()

            // Check if onboarding is required (first user)
            if (data.onboarding_required || data.requires_onboarding) {
                // Redirect to onboarding page with token
                const params = new URLSearchParams({
                    onboarding_token: data.onboarding_token,
                    email: data.email,
                    suggested_name: `${data.email.split('@')[1]} Organization`
                })
                navigate(`/onboarding?${params.toString()}`)
                return
            }

            // Normal login - store tokens
            localStorage.setItem('access_token', data.access_token)
            localStorage.setItem('refresh_token', data.refresh_token)

            // Store user data (optional, for display)
            localStorage.setItem('user', JSON.stringify(data.user))

            // Redirect to dashboard
            navigate('/app/dashboard')
        } catch (err) {
            console.error('Dev login error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Handle Google OAuth login
    function handleOAuthLogin() {
        setGoogleLoading(true)
        // Redirect to backend OAuth endpoint
        window.location.href = 'http://localhost:8000/api/auth/login?platform=web'
    }

    // Show loading while fetching config
    if (!authConfig && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <div style={{ color: 'var(--color-text-tertiary)' }}>Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
            <div
                className="w-full max-w-[480px] rounded-lg shadow-md"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px'
                }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1
                        className="font-semibold mb-2"
                        style={{
                            fontSize: 'var(--text-xl)',
                            color: 'var(--color-text-primary)',
                            fontFamily: 'var(--font-sans)'
                        }}
                    >
                        JIRA Worklog Dashboard
                    </h1>
                    <p
                        style={{
                            fontSize: 'var(--text-base)',
                            color: 'var(--color-text-secondary)',
                            lineHeight: 'var(--leading-normal)'
                        }}
                    >
                        Consolidated worklog reporting and billing automation
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        className="mb-6 px-4 py-3 rounded-lg text-sm"
                        style={{
                            background: 'var(--color-error-subtle)',
                            border: '1px solid var(--color-error)',
                            color: 'var(--color-error)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Google OAuth Login Button */}
                <button
                    onClick={handleOAuthLogin}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center font-medium transition-all"
                    style={{
                        height: '44px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-medium)',
                        cursor: googleLoading ? 'not-allowed' : 'pointer',
                        opacity: googleLoading ? '0.6' : '1'
                    }}
                    onMouseEnter={(e) => {
                        if (!googleLoading && !loading) {
                            e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.boxShadow = 'none'
                    }}
                    onMouseDown={(e) => {
                        if (!googleLoading && !loading) {
                            e.currentTarget.style.transform = 'scale(0.98)'
                        }
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                    }}
                >
                    {googleLoading ? (
                        <>
                            <svg
                                className="animate-spin mr-3"
                                style={{ width: '20px', height: '20px' }}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Redirecting...
                        </>
                    ) : (
                        <>
                            {/* Google Icon SVG */}
                            <svg className="mr-3" style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Sign in with Google
                        </>
                    )}
                </button>

                {/* Dev Mode Section - Only shown if dev_mode=true in backend */}
                {authConfig?.dev_mode && (
                    <>
                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div style={{ width: '100%', borderTop: '1px solid var(--color-border)' }} />
                            </div>
                            <div className="relative flex justify-center">
                                <span
                                    className="px-3 uppercase tracking-wider"
                                    style={{
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text-tertiary)',
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: 'var(--font-medium)'
                                    }}
                                >
                                    Development Mode
                                </span>
                            </div>
                        </div>

                        {/* Email Input Field */}
                        <div className="mb-4">
                            <label
                                htmlFor="email"
                                className="block mb-2"
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 'var(--font-medium)',
                                    color: 'var(--color-text-secondary)'
                                }}
                            >
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="dev@example.com"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    height: 'var(--input-height)',
                                    padding: '0 var(--space-3)',
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: 'var(--text-sm)',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--color-border-focus)'
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--color-border)'
                                }}
                            />
                        </div>

                        {/* Dev Login Button */}
                        <button
                            onClick={handleDevLogin}
                            disabled={loading || googleLoading}
                            className="w-full flex items-center justify-center font-medium transition-all"
                            style={{
                                height: '36px',
                                background: 'var(--color-accent)',
                                color: 'var(--color-text-inverse)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 'var(--font-medium)',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? '0.6' : '1'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && !googleLoading) {
                                    e.currentTarget.style.background = 'var(--color-accent-hover)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--color-accent)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin mr-2"
                                        style={{ width: '16px', height: '16px' }}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Logging in...
                                </>
                            ) : (
                                'Quick Dev Login'
                            )}
                        </button>

                        {/* Dev mode explanation */}
                        <p
                            className="mt-2 text-center"
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-tertiary)'
                            }}
                        >
                            Bypasses OAuth for local testing • Creates user with ADMIN role
                        </p>
                    </>
                )}

                {/* Footer note */}
                <div className="text-center mt-8">
                    <p
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        Secured with Google OAuth 2.0
                    </p>
                </div>
            </div>
        </div>
    )
}
