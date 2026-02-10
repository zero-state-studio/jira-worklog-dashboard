import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import ConfirmModal from '../components/ConfirmModal'
import { getProfile, updateProfile, updateCompany, logout, deleteAccount } from '../api/client'

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

    // Delete account modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)

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

    async function handleDeleteAccount() {
        // Require user to type "DELETE" to confirm
        if (deleteConfirmText !== 'DELETE') {
            return
        }

        setDeleting(true)

        try {
            const result = await deleteAccount()

            // Show success message before redirect
            if (result.company_deleted) {
                alert('Account eliminato con successo. Essendo l\'ultimo utente, tutti i dati aziendali sono stati eliminati.')
            } else {
                alert('Account eliminato con successo.')
            }

            // Redirect to login
            window.location.href = '/login'
        } catch (err) {
            alert(`Errore durante l'eliminazione: ${err.message}`)
            setDeleting(false)
            setShowDeleteModal(false)
            setDeleteConfirmText('')
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

            {/* Danger Zone Card */}
            <div className="glass-card p-6 border-2 border-accent-red/30">
                <h2 className="text-lg font-semibold text-accent-red mb-2">Zona Pericolosa</h2>
                <p className="text-dark-400 text-sm mb-4">
                    Elimina permanentemente il tuo account e tutti i dati associati.
                </p>
                <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm space-y-2">
                            <p className="text-accent-red font-semibold">
                                Questa azione è irreversibile!
                            </p>
                            <ul className="text-dark-300 space-y-1 list-disc list-inside">
                                <li>Il tuo account verrà eliminato permanentemente</li>
                                <li>Perderai l'accesso a tutti i dati</li>
                                {profile?.role === 'ADMIN' && (
                                    <li className="text-accent-orange">
                                        <strong>Se sei l'ultimo utente, tutti i dati aziendali verranno eliminati</strong> (team, istanze JIRA, worklog, fatturazione, ecc.)
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-accent-red text-white rounded-lg font-medium hover:bg-accent-red/90 transition-colors"
                >
                    Elimina Account
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                }}
                onConfirm={handleDeleteAccount}
                title="Conferma Eliminazione Account"
                message="Stai per eliminare definitivamente il tuo account. Questa azione non può essere annullata."
                confirmText={deleting ? "Eliminazione..." : "Elimina Account"}
                cancelText="Annulla"
                isDanger={true}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
            >
                <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 space-y-3">
                    <p className="text-dark-300 text-sm">
                        Per confermare, digita <strong className="text-accent-red">DELETE</strong> nel campo sottostante:
                    </p>
                    <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Digita DELETE"
                        className="w-full input-field"
                        disabled={deleting}
                        autoFocus
                    />
                    {deleteConfirmText && deleteConfirmText !== 'DELETE' && (
                        <p className="text-accent-red text-xs">
                            Devi digitare esattamente "DELETE" per confermare
                        </p>
                    )}
                </div>
            </ConfirmModal>
        </div>
    )
}
