import { useState, useEffect } from 'react'
import { fetchJiraAccountId, deleteJiraAccount } from '../../api/client'

const RefreshIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
)

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
)

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

export default function UserModal({ isOpen, onClose, onSave, onUserChange, user, teams, jiraInstances, loading }) {
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [teamId, setTeamId] = useState('')
    const [jiraAccounts, setJiraAccounts] = useState([])
    const [fetchingInstance, setFetchingInstance] = useState(null)
    const [fetchError, setFetchError] = useState(null)

    useEffect(() => {
        if (user) {
            setEmail(user.email || '')
            setFirstName(user.first_name || '')
            setLastName(user.last_name || '')
            setTeamId(user.team_id || '')
            setJiraAccounts(user.jira_accounts || [])
        } else {
            setEmail('')
            setFirstName('')
            setLastName('')
            setTeamId('')
            setJiraAccounts([])
        }
        setFetchError(null)
    }, [user, isOpen])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (email.trim() && firstName.trim() && lastName.trim()) {
            onSave({
                email: email.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                team_id: teamId ? parseInt(teamId) : null
            })
        }
    }

    const getAccountIdForInstance = (instanceName) => {
        const account = jiraAccounts.find(a => a.jira_instance === instanceName)
        return account?.account_id || null
    }

    const handleFetchAccountId = async (instanceName) => {
        if (!user?.id) return

        try {
            setFetchingInstance(instanceName)
            setFetchError(null)
            const result = await fetchJiraAccountId(user.id, instanceName)

            // Update local state
            setJiraAccounts(prev => {
                const filtered = prev.filter(a => a.jira_instance !== instanceName)
                return [...filtered, { jira_instance: instanceName, account_id: result.account_id }]
            })

            // Refresh parent
            if (onUserChange) {
                await onUserChange()
            }
        } catch (err) {
            setFetchError(`${instanceName}: ${err.message}`)
        } finally {
            setFetchingInstance(null)
        }
    }

    const handleDeleteAccount = async (instanceName) => {
        if (!user?.id) return

        try {
            setFetchingInstance(instanceName)
            setFetchError(null)
            await deleteJiraAccount(user.id, instanceName)

            // Update local state
            setJiraAccounts(prev => prev.filter(a => a.jira_instance !== instanceName))

            // Refresh parent
            if (onUserChange) {
                await onUserChange()
            }
        } catch (err) {
            setFetchError(`${instanceName}: ${err.message}`)
        } finally {
            setFetchingInstance(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-dark-700 animate-fade-in max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
                    <h2 className="text-xl font-bold text-dark-100">
                        {user ? 'Modifica Utente' : 'Nuovo Utente'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 min-h-0">
                    <form id="user-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="mario.rossi@company.com"
                                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                autoFocus
                            />
                        </div>

                        {/* Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Mario"
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Cognome
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Rossi"
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                />
                            </div>
                        </div>

                        {/* Team */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Team
                            </label>
                            <select
                                value={teamId}
                                onChange={(e) => setTeamId(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                            >
                                <option value="">Nessun team</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* JIRA Accounts - Only show for existing users */}
                        {user && jiraInstances.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-3">
                                    Account JIRA
                                </label>

                                {fetchError && (
                                    <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
                                        {fetchError}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {jiraInstances.map((instance) => {
                                        const accountId = getAccountIdForInstance(instance.name)
                                        const isFetching = fetchingInstance === instance.name

                                        return (
                                            <div
                                                key={instance.name}
                                                className="flex items-center justify-between p-3 bg-dark-700/50 border border-dark-600 rounded-lg"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-dark-100 text-sm">
                                                        {instance.name}
                                                    </div>
                                                    {accountId ? (
                                                        <div className="flex items-center gap-1 text-xs text-accent-green mt-1">
                                                            <CheckIcon />
                                                            <span className="truncate" title={accountId}>
                                                                {accountId.substring(0, 20)}...
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-dark-400 mt-1">
                                                            Non configurato
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 ml-3">
                                                    {accountId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAccount(instance.name)}
                                                            disabled={isFetching}
                                                            className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Rimuovi"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleFetchAccountId(instance.name)}
                                                        disabled={isFetching}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-dark-600 text-dark-200 text-sm rounded-lg hover:bg-dark-500 transition-colors disabled:opacity-50"
                                                    >
                                                        {isFetching ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-200"></div>
                                                        ) : (
                                                            <RefreshIcon />
                                                        )}
                                                        <span>{accountId ? 'Aggiorna' : 'Fetch'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <p className="text-xs text-dark-500 mt-2">
                                    Clicca "Fetch" per recuperare l'Account ID da JIRA usando l'email dell'utente
                                </p>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-700 sticky bottom-0 bg-dark-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            form="user-form"
                            disabled={!email.trim() || !firstName.trim() || !lastName.trim() || loading}
                            className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvataggio...' : 'Salva'}
                        </button>
                    </div>
            </div>
        </div>
    )
}
