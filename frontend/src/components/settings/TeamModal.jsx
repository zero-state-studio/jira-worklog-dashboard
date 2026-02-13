import { useState, useEffect, useMemo } from 'react'
import { Select } from '../common'
import { canManageTeams } from '../../constants/roles'

export default function TeamModal({ isOpen, onClose, onSave, team, users = [], loading }) {
    const [name, setName] = useState('')
    const [ownerId, setOwnerId] = useState('')

    const eligibleOwners = useMemo(() => {
        return users.filter(u => u.role && canManageTeams(u.role))
    }, [users])

    const ownerOptions = useMemo(() => {
        return [
            { value: '', label: 'Nessun owner' },
            ...eligibleOwners.map(u => ({
                value: String(u.id),
                label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
            }))
        ]
    }, [eligibleOwners])

    useEffect(() => {
        if (team) {
            setName(team.name)
            setOwnerId(team.owner_id ? String(team.owner_id) : '')
        } else {
            setName('')
            setOwnerId('')
        }
    }, [team, isOpen])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim()) {
            onSave({
                name: name.trim(),
                owner_id: ownerId ? parseInt(ownerId) : null
            })
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center py-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-lg shadow-lg w-full max-w-md mx-4 border border-solid max-h-[calc(100vh-4rem)] overflow-y-auto animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-solid">
                    <h2 className="text-xl font-semibold text-primary">
                        {team ? 'Modifica Team' : 'Nuovo Team'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md hover:bg-surface-hover transition-colors"
                    >
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-secondary mb-2">
                            Nome Team
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Es: Frontend Team"
                            className="w-full px-4 py-3 bg-surface border border-solid rounded-md text-primary placeholder-tertiary focus:outline-none focus:border-focus focus:ring-1 focus:ring-accent/20"
                            autoFocus
                        />
                    </div>

                    <div className="px-6 pb-4">
                        <Select
                            label="Owner"
                            options={ownerOptions}
                            value={ownerId}
                            onChange={setOwnerId}
                            searchable
                            helper="Optional - Must have PM role or higher"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-solid">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="px-5 py-2 bg-accent text-inverse font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvataggio...' : 'Salva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
