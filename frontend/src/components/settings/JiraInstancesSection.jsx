import { useState, useEffect } from 'react'
import {
    getJiraInstances,
    createJiraInstance,
    updateJiraInstance,
    deleteJiraInstance,
    testJiraInstance,
    getJiraInstance,
    getComplementaryGroups,
    createComplementaryGroup,
    updateComplementaryGroup,
    deleteComplementaryGroup
} from '../../api/client'

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

const ServerIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
)

const LinkIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
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

const EyeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
)

const EyeOffIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
)

// Instance Modal Component
function InstanceModal({ isOpen, onClose, onSave, instance, loading }) {
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        email: '',
        api_token: '',
        tempo_api_token: ''
    })
    const [showToken, setShowToken] = useState(false)
    const [showTempoToken, setShowTempoToken] = useState(false)

    // Update form data when instance changes (for editing)
    useEffect(() => {
        if (instance) {
            setFormData({
                name: instance.name || '',
                url: instance.url || '',
                email: instance.email || '',
                api_token: instance.api_token || '',
                tempo_api_token: instance.tempo_api_token || ''
            })
        } else {
            setFormData({
                name: '',
                url: '',
                email: '',
                api_token: '',
                tempo_api_token: ''
            })
        }
    }, [instance])

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-dark-700">
                <div className="p-6 border-b border-dark-700">
                    <h3 className="text-lg font-semibold text-dark-100">
                        {instance ? 'Modifica Istanza JIRA' : 'Nuova Istanza JIRA'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                            Nome *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-field w-full"
                            placeholder="es. OT Consulting"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                            URL JIRA *
                        </label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="input-field w-full"
                            placeholder="https://company.atlassian.net"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input-field w-full"
                            placeholder="user@company.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                            API Token *
                        </label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={formData.api_token}
                                onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                                className="input-field w-full pr-10"
                                placeholder="Il tuo API token JIRA"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
                            >
                                {showToken ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        <p className="text-xs text-dark-500 mt-1">
                            Genera su: id.atlassian.com/manage-profile/security/api-tokens
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                            Tempo API Token (opzionale)
                        </label>
                        <div className="relative">
                            <input
                                type={showTempoToken ? 'text' : 'password'}
                                value={formData.tempo_api_token}
                                onChange={(e) => setFormData({ ...formData, tempo_api_token: e.target.value })}
                                className="input-field w-full pr-10"
                                placeholder="Token per Tempo Timesheets"
                            />
                            <button
                                type="button"
                                onClick={() => setShowTempoToken(!showTempoToken)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
                            >
                                {showTempoToken ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Salvataggio...' : 'Salva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Complementary Group Modal
function ComplementaryGroupModal({ isOpen, onClose, onSave, group, instances, loading }) {
    const [formData, setFormData] = useState({
        name: '',
        primary_instance_id: null,
        member_ids: []
    })

    // Update form data when group changes (for editing)
    useEffect(() => {
        if (group) {
            setFormData({
                name: group.name || '',
                primary_instance_id: group.primary_instance_id || null,
                member_ids: group.members?.map(m => m.id) || []
            })
        } else {
            setFormData({
                name: '',
                primary_instance_id: null,
                member_ids: []
            })
        }
    }, [group])

    if (!isOpen) return null

    const handleToggleMember = (instanceId) => {
        setFormData(prev => ({
            ...prev,
            member_ids: prev.member_ids.includes(instanceId)
                ? prev.member_ids.filter(id => id !== instanceId)
                : [...prev.member_ids, instanceId]
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-dark-700">
                <div className="p-6 border-b border-dark-700">
                    <h3 className="text-lg font-semibold text-dark-100">
                        {group ? 'Modifica Gruppo Complementare' : 'Nuovo Gruppo Complementare'}
                    </h3>
                    <p className="text-sm text-dark-400 mt-1">
                        Le istanze complementari tracciano lo stesso lavoro (es. JIRA cliente + JIRA interno)
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                            Nome Gruppo *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-field w-full"
                            placeholder="es. Progetto XYZ"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Istanze nel Gruppo
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {instances.map(inst => (
                                <label
                                    key={inst.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-700/50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.member_ids.includes(inst.id)}
                                        onChange={() => handleToggleMember(inst.id)}
                                        className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent-blue focus:ring-accent-blue/50"
                                    />
                                    <span className="text-dark-200">{inst.name}</span>
                                    <span className="text-dark-500 text-sm">{inst.url}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {formData.member_ids.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1">
                                Istanza Primaria
                            </label>
                            <select
                                value={formData.primary_instance_id || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    primary_instance_id: e.target.value ? parseInt(e.target.value) : null
                                })}
                                className="input-field w-full"
                            >
                                <option value="">Seleziona istanza primaria...</option>
                                {instances
                                    .filter(inst => formData.member_ids.includes(inst.id))
                                    .map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))
                                }
                            </select>
                            <p className="text-xs text-dark-500 mt-1">
                                L'istanza primaria viene usata per contare le ore nella vista "Tutti"
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading || formData.member_ids.length < 2}
                            className="px-4 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Salvataggio...' : 'Salva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function JiraInstancesSection({ instances, complementaryGroups, onDataChange }) {
    const [instanceModalOpen, setInstanceModalOpen] = useState(false)
    const [groupModalOpen, setGroupModalOpen] = useState(false)
    const [editingInstance, setEditingInstance] = useState(null)
    const [editingGroup, setEditingGroup] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [testResult, setTestResult] = useState(null)

    const handleCreateInstance = () => {
        setEditingInstance(null)
        setInstanceModalOpen(true)
    }

    const handleEditInstance = async (instance) => {
        try {
            // Fetch full instance with credentials
            const fullInstance = await getJiraInstance(instance.id, true)
            setEditingInstance(fullInstance)
            setInstanceModalOpen(true)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleSaveInstance = async (data) => {
        try {
            setLoading(true)
            setError(null)

            if (editingInstance) {
                await updateJiraInstance(editingInstance.id, data)
            } else {
                await createJiraInstance(data)
            }

            setInstanceModalOpen(false)
            setEditingInstance(null)
            await onDataChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteInstance = async (instanceId) => {
        try {
            setLoading(true)
            setError(null)
            await deleteJiraInstance(instanceId)
            setDeleteConfirm(null)
            await onDataChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleTestInstance = async (instanceId) => {
        try {
            setLoading(true)
            setTestResult(null)
            const result = await testJiraInstance(instanceId)
            setTestResult({ instanceId, ...result })
        } catch (err) {
            setTestResult({ instanceId, success: false, message: err.message })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateGroup = () => {
        setEditingGroup(null)
        setGroupModalOpen(true)
    }

    const handleEditGroup = (group) => {
        setEditingGroup(group)
        setGroupModalOpen(true)
    }

    const handleSaveGroup = async (data) => {
        try {
            setLoading(true)
            setError(null)

            if (editingGroup) {
                await updateComplementaryGroup(editingGroup.id, data)
            } else {
                await createComplementaryGroup(data)
            }

            setGroupModalOpen(false)
            setEditingGroup(null)
            await onDataChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteGroup = async (groupId) => {
        try {
            setLoading(true)
            setError(null)
            await deleteComplementaryGroup(groupId)
            setDeleteConfirm(null)
            await onDataChange()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* JIRA Instances Section */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-dark-100">Istanze JIRA</h2>
                        <p className="text-sm text-dark-400 mt-1">Configura le connessioni ai tuoi JIRA Cloud</p>
                    </div>
                    <button
                        onClick={handleCreateInstance}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity"
                    >
                        <PlusIcon />
                        Aggiungi JIRA
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {instances.length === 0 ? (
                    <div className="text-center py-12">
                        <ServerIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                        <p className="text-dark-400">Nessuna istanza JIRA configurata</p>
                        <p className="text-dark-500 text-sm mt-1">
                            Aggiungi la tua prima istanza JIRA per iniziare
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="table-header">Nome</th>
                                    <th className="table-header">URL</th>
                                    <th className="table-header text-center">Stato</th>
                                    <th className="table-header text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {instances.map((instance) => {
                                    const isFromConfig = instance.source === 'config.yaml'
                                    return (
                                    <tr key={instance.id} className="hover:bg-dark-700/30 transition-colors">
                                        <td className="table-cell">
                                            <span className="font-medium text-dark-100">{instance.name}</span>
                                            {instance.has_tempo && (
                                                <span className="ml-2 text-xs text-accent-purple">+ Tempo</span>
                                            )}
                                            {isFromConfig && (
                                                <span className="ml-2 text-xs bg-dark-600 text-dark-300 px-2 py-0.5 rounded">config.yaml</span>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            <a
                                                href={instance.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-accent-blue hover:underline"
                                            >
                                                {instance.url}
                                            </a>
                                        </td>
                                        <td className="table-cell text-center">
                                            {testResult?.instanceId === instance.id ? (
                                                testResult.success ? (
                                                    <span className="inline-flex items-center gap-1 text-green-400">
                                                        <CheckIcon /> Connesso
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-400">
                                                        <XIcon /> Errore
                                                    </span>
                                                )
                                            ) : instance.is_active ? (
                                                <span className="badge-green">Attivo</span>
                                            ) : (
                                                <span className="badge-gray">Inattivo</span>
                                            )}
                                        </td>
                                        <td className="table-cell text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!isFromConfig && (
                                                    <>
                                                        <button
                                                            onClick={() => handleTestInstance(instance.id)}
                                                            disabled={loading}
                                                            className="px-2 py-1 text-xs text-dark-300 hover:text-accent-blue hover:bg-dark-700 rounded transition-colors"
                                                            title="Test connessione"
                                                        >
                                                            Test
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditInstance(instance)}
                                                            className="p-2 text-dark-400 hover:text-accent-blue hover:bg-dark-700 rounded-lg transition-colors"
                                                            title="Modifica"
                                                        >
                                                            <EditIcon />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm({ type: 'instance', data: instance })}
                                                            className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                                                            title="Elimina"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </>
                                                )}
                                                {isFromConfig && (
                                                    <span className="text-xs text-dark-500 italic">Sola lettura</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Complementary Groups Section */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-dark-100">Gruppi Complementari</h2>
                        <p className="text-sm text-dark-400 mt-1">
                            Raggruppa istanze che tracciano lo stesso lavoro per evitare conteggi doppi
                        </p>
                    </div>
                    <button
                        onClick={handleCreateGroup}
                        disabled={instances.length < 2}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50"
                        title={instances.length < 2 ? 'Servono almeno 2 istanze' : ''}
                    >
                        <PlusIcon />
                        Nuovo Gruppo
                    </button>
                </div>

                {complementaryGroups.length === 0 ? (
                    <div className="text-center py-12">
                        <LinkIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                        <p className="text-dark-400">Nessun gruppo complementare configurato</p>
                        <p className="text-dark-500 text-sm mt-1">
                            Crea un gruppo se hai istanze JIRA che tracciano lo stesso lavoro
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {complementaryGroups.map((group) => (
                            <div
                                key={group.id}
                                className="border border-dark-700 rounded-lg p-4 hover:bg-dark-700/20 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-dark-100">{group.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEditGroup(group)}
                                            className="p-2 text-dark-400 hover:text-accent-blue hover:bg-dark-700 rounded-lg transition-colors"
                                            title="Modifica"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm({ type: 'group', data: group })}
                                            className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                                            title="Elimina"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {group.members.map((member) => (
                                        <span
                                            key={member.id}
                                            className={`px-2 py-1 rounded text-sm ${
                                                member.id === group.primary_instance_id
                                                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                                                    : 'bg-dark-700 text-dark-300'
                                            }`}
                                        >
                                            {member.name}
                                            {member.id === group.primary_instance_id && ' (primaria)'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instance Modal */}
            <InstanceModal
                isOpen={instanceModalOpen}
                onClose={() => {
                    setInstanceModalOpen(false)
                    setEditingInstance(null)
                    setError(null)
                }}
                onSave={handleSaveInstance}
                instance={editingInstance}
                loading={loading}
            />

            {/* Complementary Group Modal */}
            <ComplementaryGroupModal
                isOpen={groupModalOpen}
                onClose={() => {
                    setGroupModalOpen(false)
                    setEditingGroup(null)
                    setError(null)
                }}
                onSave={handleSaveGroup}
                group={editingGroup}
                instances={instances}
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
                            Sei sicuro di voler eliminare {deleteConfirm.type === 'instance' ? "l'istanza" : 'il gruppo'}{' '}
                            <strong>"{deleteConfirm.data.name}"</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => deleteConfirm.type === 'instance'
                                    ? handleDeleteInstance(deleteConfirm.data.id)
                                    : handleDeleteGroup(deleteConfirm.data.id)
                                }
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
