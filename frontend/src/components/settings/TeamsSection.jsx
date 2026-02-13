import { useState } from 'react'
import { createTeam, updateTeam, deleteTeam } from '../../api/client'
import TeamModal from './TeamModal'

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

const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
)

export default function TeamsSection({ teams, onTeamsChange }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [editingTeam, setEditingTeam] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const handleCreate = () => {
        setEditingTeam(null)
        setModalOpen(true)
    }

    const handleEdit = (team) => {
        setEditingTeam(team)
        setModalOpen(true)
    }

    const handleSave = async (data) => {
        try {
            setLoading(true)
            setError(null)

            if (editingTeam) {
                await updateTeam(editingTeam.id, data)
            } else {
                await createTeam(data.name)
            }

            setModalOpen(false)
            setEditingTeam(null)
            await onTeamsChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (teamId) => {
        try {
            setLoading(true)
            setError(null)
            await deleteTeam(teamId)
            setDeleteConfirm(null)
            await onTeamsChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-primary">Team</h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg  hover:opacity-90 transition-opacity"
                >
                    <PlusIcon />
                    Aggiungi Team
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-error text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            {teams.length === 0 ? (
                <div className="text-center py-12">
                    <UsersIcon className="w-12 h-12 text-tertiary mx-auto mb-4" />
                    <p className="text-tertiary">Nessun team configurato</p>
                    <p className="text-tertiary text-sm mt-1">
                        Crea un nuovo team o importa dalla configurazione
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="table-header">Nome Team</th>
                                <th className="table-header text-center">Membri</th>
                                <th className="table-header text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <tr key={team.id} className="hover:bg-surface/30 transition-colors">
                                    <td className="table-cell">
                                        <span className="font-medium text-primary">{team.name}</span>
                                    </td>
                                    <td className="table-cell text-center">
                                        <span className="badge-blue">{team.member_count}</span>
                                    </td>
                                    <td className="table-cell text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(team)}
                                                className="p-2 text-tertiary hover:text-accent-blue hover:bg-surface rounded-lg transition-colors"
                                                title="Modifica"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(team)}
                                                className="p-2 text-tertiary hover:text-error hover:bg-surface rounded-lg transition-colors"
                                                title="Elimina"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <TeamModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false)
                    setEditingTeam(null)
                    setError(null)
                }}
                onSave={handleSave}
                team={editingTeam}
                loading={loading}
            />

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative bg-surface rounded-lg shadow-lg w-full max-w-md mx-4 border border-solid p-6">
                        <h3 className="text-lg font-semibold text-primary mb-2">
                            Conferma eliminazione
                        </h3>
                        <p className="text-secondary mb-6">
                            Sei sicuro di voler eliminare il team <strong>"{deleteConfirm.name}"</strong>?
                            {deleteConfirm.member_count > 0 && (
                                <span className="block mt-2 text-yellow-400 text-sm">
                                    Attenzione: {deleteConfirm.member_count} utenti perderanno l'assegnazione al team.
                                </span>
                            )}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
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
