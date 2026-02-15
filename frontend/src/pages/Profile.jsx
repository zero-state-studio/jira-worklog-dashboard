import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import { Card, Button, Input, Badge, Modal } from '../components/common'
import { getProfile, updateProfile, updateCompany, logout, deleteAccount } from '../api/client'
import { AlertTriangle } from 'lucide-react'

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
                <div className="h-8 w-48 bg-surface rounded animate-pulse" />
                <div className="h-64 bg-surface rounded animate-pulse" />
                <div className="h-48 bg-surface rounded animate-pulse" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto">
                <Card>
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                            <span className="text-error text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-primary mb-2">Error Loading Profile</h3>
                        <p className="text-sm text-tertiary">{error}</p>
                    </div>
                </Card>
            </div>
        )
    }

    const isAdmin = profile?.role === 'ADMIN'

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case 'ADMIN': return 'warning'
            case 'MANAGER': return 'info'
            case 'USER': return 'success'
            default: return 'default'
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <div className="text-xs text-tertiary">
                <span>Workspace</span> <span className="mx-2">/</span> <span className="text-primary">Profile</span>
            </div>

            {/* Page title */}
            <div>
                <h1 className="text-xl font-semibold text-primary mb-1">Il Mio Profilo</h1>
                <p className="text-sm text-tertiary">Gestisci le tue informazioni personali e le impostazioni dell'account</p>
            </div>

            {/* Save message toast */}
            {saveMessage && (
                <Card padding="sm">
                    <div className={`flex items-center gap-2 text-sm ${
                        saveMessage.type === 'success' ? 'text-success' : 'text-error'
                    }`}>
                        <span className="font-medium">{saveMessage.text}</span>
                    </div>
                </Card>
            )}

            {/* Personal Info Card */}
            <Card>
                <h2 className="text-base font-semibold text-primary mb-6">Informazioni Personali</h2>
                <div className="flex items-start gap-6">
                    <UserAvatar user={profile} size="lg" />
                    <form onSubmit={handleSaveProfile} className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Nome"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Nome"
                            />
                            <Input
                                label="Cognome"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Cognome"
                            />
                        </div>
                        <Input
                            label="Email"
                            type="email"
                            value={profile?.email || ''}
                            disabled
                            hint="L'email non può essere modificata"
                        />
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-secondary">Ruolo:</span>
                            <Badge variant={getRoleBadgeVariant(profile?.role)}>{profile?.role}</Badge>
                        </div>
                        <div className="pt-2">
                            <Button type="submit" disabled={saving} loading={saving}>
                                Salva Modifiche
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>

            {/* Organization Card */}
            <Card>
                <h2 className="text-base font-semibold text-primary mb-4">Organizzazione</h2>
                <form onSubmit={handleSaveCompany} className="space-y-4">
                    <Input
                        label="Nome Azienda"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={!isAdmin}
                        placeholder="Nome dell'azienda"
                        hint={!isAdmin ? "Solo gli amministratori possono modificare il nome dell'azienda" : undefined}
                    />
                    {isAdmin && (
                        <div className="pt-2">
                            <Button type="submit" disabled={saving} loading={saving}>
                                Aggiorna Organizzazione
                            </Button>
                        </div>
                    )}
                </form>
            </Card>

            {/* Session Card */}
            <Card>
                <h2 className="text-base font-semibold text-primary mb-4">Sessione</h2>
                <div className="space-y-3">
                    {profile?.last_login && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-tertiary">Ultimo accesso:</span>
                            <span className="text-secondary">
                                {new Date(profile.last_login).toLocaleString('it-IT', {
                                    day: '2-digit', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}
                    <div className="pt-2">
                        <Button variant="secondary" onClick={handleLogout}>
                            Esci dall'account
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Danger Zone Card */}
            <Card className="border-2 border-error">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} className="text-error" />
                        <h2 className="text-base font-semibold text-error">Zona Pericolosa</h2>
                    </div>

                    <p className="text-sm text-secondary">
                        Elimina permanentemente il tuo account e tutti i dati associati.
                    </p>

                    <div className="bg-error/5 border border-error/20 rounded-md p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-error flex-shrink-0 mt-0.5" />
                            <div className="text-sm space-y-2">
                                <p className="text-error font-semibold">
                                    Questa azione è irreversibile!
                                </p>
                                <ul className="text-secondary space-y-1 list-disc list-inside">
                                    <li>Il tuo account verrà eliminato permanentemente</li>
                                    <li>Perderai l'accesso a tutti i dati</li>
                                    {profile?.role === 'ADMIN' && (
                                        <li className="text-warning font-medium">
                                            Se sei l'ultimo utente, tutti i dati aziendali verranno eliminati (team, istanze JIRA, worklog, fatturazione, ecc.)
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="danger"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        Elimina Account
                    </Button>
                </div>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                }}
                title="Conferma Eliminazione Account"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-error/5 border border-error/20 rounded-md p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-error flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-secondary">
                                Stai per eliminare definitivamente il tuo account. Questa azione non può essere annullata.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-secondary">
                            Per confermare, digita <strong className="text-error font-semibold">DELETE</strong> nel campo sottostante:
                        </p>
                        <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Digita DELETE"
                            disabled={deleting}
                            error={deleteConfirmText && deleteConfirmText !== 'DELETE' ? 'Devi digitare esattamente "DELETE" per confermare' : undefined}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowDeleteModal(false)
                                setDeleteConfirmText('')
                            }}
                            disabled={deleting}
                        >
                            Annulla
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== 'DELETE' || deleting}
                            loading={deleting}
                        >
                            Elimina Account
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
