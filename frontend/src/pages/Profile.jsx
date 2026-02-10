import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import { getProfile, updateProfile, updateCompany, logout } from '../api/client'

export default function Profile() {
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Editable fields
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState(null)

    useEffect(() => {
        loadProfile()
    }, [])

    async function loadProfile() {
        try {
            setLoading(true)
            const data = await getProfile()
            setProfile(data)
            setFirstName(data.first_name || '')
            setLastName(data.last_name || '')
            setCompanyName(data.company?.name || '')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveProfile(e) {
        e.preventDefault()
        setSaving(true)
        setSaveMessage(null)
        try {
            const updated = await updateProfile({ first_name: firstName, last_name: lastName })
            setProfile(prev => ({ ...prev, ...updated }))
            // Update localStorage user data
            const stored = JSON.parse(localStorage.getItem('user') || '{}')
            localStorage.setItem('user', JSON.stringify({ ...stored, first_name: firstName, last_name: lastName }))
            setSaveMessage({ type: 'success', text: 'Profilo aggiornato' })
        } catch (err) {
            setSaveMessage({ type: 'error', text: err.message })
        } finally {
            setSaving(false)
        }
    }

    async function handleSaveCompany(e) {
        e.preventDefault()
        setSaving(true)
        setSaveMessage(null)
        try {
            await updateCompany({ name: companyName })
            setProfile(prev => ({ ...prev, company: { ...prev.company, name: companyName } }))
            setSaveMessage({ type: 'success', text: 'Organizzazione aggiornata' })
        } catch (err) {
            setSaveMessage({ type: 'error', text: err.message })
        } finally {
            setSaving(false)
        }
    }

    async function handleLogout() {
        try {
            await logout()
        } catch {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
    }

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="loading-shimmer h-10 w-48 rounded-lg" />
                <div className="loading-shimmer h-64 rounded-xl" />
                <div className="loading-shimmer h-48 rounded-xl" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl">
                    <strong>Errore:</strong> {error}
                </div>
            </div>
        )
    }

    const isAdmin = profile?.role === 'ADMIN'

    const roleBadgeClass = {
        ADMIN: 'badge-purple',
        MANAGER: 'badge-blue',
        USER: 'badge-green',
    }[profile?.role] || 'badge-blue'

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Page title */}
            <h1 className="text-2xl font-bold text-dark-100">Il Mio Profilo</h1>

            {/* Save message toast */}
            {saveMessage && (
                <div className={`px-4 py-3 rounded-lg text-sm ${
                    saveMessage.type === 'success'
                        ? 'bg-accent-green/10 border border-accent-green/30 text-accent-green'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {saveMessage.text}
                </div>
            )}

            {/* Personal Info Card */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-dark-100 mb-6">Informazioni Personali</h2>
                <div className="flex items-start gap-6">
                    <UserAvatar user={profile} size="lg" />
                    <form onSubmit={handleSaveProfile} className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5">Nome</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full input-field"
                                    placeholder="Nome"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1.5">Cognome</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full input-field"
                                    placeholder="Cognome"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={profile?.email || ''}
                                disabled
                                className="w-full input-field opacity-60 cursor-not-allowed"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-dark-300">Ruolo:</span>
                            <span className={roleBadgeClass}>{profile?.role}</span>
                        </div>
                        <div className="pt-2">
                            <button type="submit" disabled={saving} className="btn-primary">
                                {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Organization Card */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-dark-100 mb-4">Organizzazione</h2>
                <form onSubmit={handleSaveCompany} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Nome Azienda</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full input-field ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                            placeholder="Nome dell'azienda"
                        />
                        {!isAdmin && (
                            <p className="text-xs text-dark-400 mt-1.5">Solo gli amministratori possono modificare il nome dell'azienda.</p>
                        )}
                    </div>
                    {isAdmin && (
                        <div className="pt-2">
                            <button type="submit" disabled={saving} className="btn-primary">
                                {saving ? 'Salvataggio...' : 'Aggiorna Organizzazione'}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* Session Card */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-dark-100 mb-4">Sessione</h2>
                <div className="space-y-3">
                    {profile?.last_login && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-dark-400">Ultimo accesso:</span>
                            <span className="text-dark-200">
                                {new Date(profile.last_login).toLocaleString('it-IT', {
                                    day: '2-digit', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}
                    <div className="pt-2">
                        <button
                            onClick={handleLogout}
                            className="btn-secondary text-accent-red border-accent-red/50 hover:bg-accent-red/10 hover:border-accent-red"
                        >
                            Esci dall'account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
