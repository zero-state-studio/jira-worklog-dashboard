import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [authConfig, setAuthConfig] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [email, setEmail] = useState('dev@dev.local')
    const navigate = useNavigate()

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
        // Redirect to backend OAuth endpoint
        window.location.href = 'http://localhost:8000/api/auth/login?platform=web'
    }

    // Show loading while fetching config
    if (!authConfig && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="text-dark-400">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900">
            <div className="bg-dark-800 p-8 rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <h1 className="text-3xl font-bold text-white mb-2 text-center">
                    JIRA Worklog Dashboard
                </h1>
                <p className="text-dark-400 text-center mb-8">
                    Sign in to continue
                </p>

                {/* Error message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Google OAuth Login Button - Always visible */}
                <button
                    onClick={handleOAuthLogin}
                    disabled={loading}
                    className="w-full bg-white text-dark-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors mb-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {/* Google Icon SVG */}
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                </button>

                {/* Dev Mode Section - Only shown if dev_mode=true in backend */}
                {authConfig?.dev_mode && (
                    <>
                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dark-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-dark-800 text-dark-500 uppercase tracking-wider">
                                    Development Mode
                                </span>
                            </div>
                        </div>

                        {/* Email Input Field */}
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            />
                        </div>

                        {/* Dev Login Button */}
                        <button
                            onClick={handleDevLogin}
                            disabled={loading}
                            className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Logging in...
                                </>
                            ) : (
                                <>⚡ Quick Dev Login</>
                            )}
                        </button>

                        {/* Dev mode explanation */}
                        <p className="text-dark-500 text-xs mt-2 text-center">
                            Bypasses OAuth for local testing • Creates user with ADMIN role
                        </p>
                    </>
                )}

                {/* Footer note */}
                <p className="text-dark-600 text-xs mt-8 text-center">
                    By signing in, you agree to our Terms of Service
                </p>
            </div>
        </div>
    )
}
