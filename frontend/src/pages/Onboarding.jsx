import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeOnboarding } from '../api/client'

export default function Onboarding() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const onboardingToken = searchParams.get('onboarding_token') || ''
    const email = searchParams.get('email') || ''
    const suggestedName = searchParams.get('suggested_name') || ''

    const [companyName, setCompanyName] = useState(suggestedName)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // If no onboarding token, redirect to login
    useEffect(() => {
        if (!onboardingToken) {
            navigate('/login', { replace: true })
        }
    }, [onboardingToken, navigate])

    async function handleSubmit(e) {
        e.preventDefault()

        if (!companyName.trim()) {
            setError("Inserisci il nome dell'azienda")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const data = await completeOnboarding(onboardingToken, companyName.trim())

            // Save tokens and user data
            localStorage.setItem('access_token', data.access_token)
            localStorage.setItem('refresh_token', data.refresh_token)
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user))
            }

            // Redirect to dashboard
            navigate('/app/dashboard', { replace: true })
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!onboardingToken) return null

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900">
            <div className="bg-dark-800 p-8 rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Configura la tua Organizzazione
                    </h1>
                    <p className="text-dark-400 text-sm">
                        Benvenuto! Completa la configurazione per iniziare.
                    </p>
                </div>

                {/* Email display */}
                {email && (
                    <div className="bg-dark-700/50 rounded-lg px-4 py-3 mb-6">
                        <p className="text-xs text-dark-400 mb-1">Account</p>
                        <p className="text-sm text-dark-200">{email}</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                        <strong>Errore:</strong> {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="companyName" className="block text-sm font-medium text-dark-300 mb-2">
                            Nome Azienda
                        </label>
                        <input
                            type="text"
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Es. Acme S.r.l."
                            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-xs text-dark-500 mt-1.5">
                            Potrai modificarlo in seguito dalle impostazioni.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Configurazione in corso...
                            </>
                        ) : (
                            'Inizia'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-dark-600 text-xs mt-6 text-center">
                    JIRA Worklog Dashboard
                </p>
            </div>
        </div>
    )
}
