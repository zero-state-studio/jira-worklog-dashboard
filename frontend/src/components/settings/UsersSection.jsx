import { useState } from 'react'
import { createUser, updateUser, deleteUser } from '../../api/client'
import UserModal from './UserModal'

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
)

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
)

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
)

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
)

const XIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

export default function UsersSection({ users, teams, jiraInstances, onUsersChange }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const handleCreate = () => {
        setEditingUser(null)
        setModalOpen(true)
    }

    const handleEdit = (user) => {
        setEditingUser(user)
        setModalOpen(true)
    }

    const handleSave = async (data) => {
        try {
            setLoading(true)
            setError(null)

            if (editingUser) {
                await updateUser(editingUser.id, data)
            } else {
                await createUser(data)
            }

            setModalOpen(false)
            setEditingUser(null)
            await onUsersChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (userId) => {
        try {
            setLoading(true)
            setError(null)
            await deleteUser(userId)
            setDeleteConfirm(null)
            await onUsersChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getJiraAccountStatus = (user) => {
        const total = jiraInstances.length
        const configured = user.jira_accounts?.length || 0
        return { total, configured }
    }

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-dark-100">Utenti</h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity"
                >
                    <PlusIcon />
                    Aggiungi Utente
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            {users.length === 0 ? (
                <div className="text-center py-12">
                    <UserIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                    <p className="text-dark-400">Nessun utente configurato</p>
                    <p className="text-dark-500 text-sm mt-1">
                        Crea un nuovo utente o importa dalla configurazione
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="table-header">Nome</th>
                                <th className="table-header">Email</th>
                                <th className="table-header">Team</th>
                                <th className="table-header text-center">Account JIRA</th>
                                <th className="table-header text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const jiraStatus = getJiraAccountStatus(user)
                                const allConfigured = jiraStatus.configured === jiraStatus.total && jiraStatus.total > 0

                                return (
                                    <tr key={user.id} className="hover:bg-dark-700/30 transition-colors">
                                        <td className="table-cell">
                                            <span className="font-medium text-dark-100">
                                                {user.first_name} {user.last_name}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <span className="text-dark-300">{user.email}</span>
                                        </td>
                                        <td className="table-cell">
                                            {user.team_name ? (
                                                <span className="badge-purple">{user.team_name}</span>
                                            ) : (
                                                <span className="text-dark-500">-</span>
                                            )}
                                        </td>
                                        <td className="table-cell text-center">
                                            {jiraStatus.total > 0 ? (
                                                <span className={`inline-flex items-center gap-1 ${
                                                    allConfigured ? 'text-accent-green' : 'text-yellow-400'
                                                }`}>
                                                    {allConfigured ? <CheckIcon /> : <XIcon />}
                                                    <span className="text-sm">
                                                        {jiraStatus.configured}/{jiraStatus.total}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-dark-500">-</span>
                                            )}
                                        </td>
                                        <td className="table-cell text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-dark-400 hover:text-accent-blue hover:bg-dark-700 rounded-lg transition-colors"
                                                    title="Modifica"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(user)}
                                                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                                                    title="Elimina"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <UserModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false)
                    setEditingUser(null)
                    setError(null)
                }}
                onSave={handleSave}
                onUserChange={onUsersChange}
                user={editingUser}
                teams={teams}
                jiraInstances={jiraInstances}
                loading={loading}
            />

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-dark-700 p-6">
                        <h3 className="text-lg font-semibold text-dark-100 mb-2">
                            Conferma eliminazione
                        </h3>
                        <p className="text-dark-300 mb-6">
                            Sei sicuro di voler eliminare l'utente <strong>"{deleteConfirm.first_name} {deleteConfirm.last_name}"</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                disabled={loading}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Eliminazione...' : 'Elimina'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
