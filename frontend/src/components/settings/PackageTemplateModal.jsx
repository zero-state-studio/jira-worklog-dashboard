import { useState, useEffect, useRef } from 'react'
import { getJiraInstances, getInstanceIssueTypes } from '../../api/client'

export default function PackageTemplateModal({ isOpen, onClose, onSave, template, loading }) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [elements, setElements] = useState([])
    const [newElement, setNewElement] = useState('')
    const [parentIssueType, setParentIssueType] = useState('Task')
    const [childIssueType, setChildIssueType] = useState('Sub-task')
    const [selectedInstanceIds, setSelectedInstanceIds] = useState([])

    const [jiraInstances, setJiraInstances] = useState([])
    const [issueTypes, setIssueTypes] = useState([])
    const [loadingIssueTypes, setLoadingIssueTypes] = useState(false)

    const elementInputRef = useRef(null)

    // Load JIRA instances on open
    useEffect(() => {
        if (isOpen) {
            getJiraInstances()
                .then(data => setJiraInstances(data.instances || []))
                .catch(() => setJiraInstances([]))
        }
    }, [isOpen])

    // Load template data
    useEffect(() => {
        if (template) {
            setName(template.name || '')
            setDescription(template.description || '')
            setElements(template.elements ? template.elements.map(e => typeof e === 'string' ? e : e.name) : [])
            setParentIssueType(template.parent_issue_type || 'Task')
            setChildIssueType(template.child_issue_type || 'Sub-task')
            setSelectedInstanceIds(template.instances ? template.instances.map(i => i.id) : [])
        } else {
            setName('')
            setDescription('')
            setElements([])
            setParentIssueType('Task')
            setChildIssueType('Sub-task')
            setSelectedInstanceIds([])
        }
        setNewElement('')
        setIssueTypes([])
    }, [template, isOpen])

    // Fetch issue types when selected instances change
    useEffect(() => {
        if (selectedInstanceIds.length === 0) {
            setIssueTypes([])
            return
        }

        const fetchIssueTypes = async () => {
            setLoadingIssueTypes(true)
            try {
                const allTypes = new Map()
                for (const instanceId of selectedInstanceIds) {
                    const data = await getInstanceIssueTypes(instanceId)
                    for (const t of (data.issue_types || [])) {
                        if (!allTypes.has(t.name)) {
                            allTypes.set(t.name, t)
                        }
                    }
                }
                setIssueTypes(Array.from(allTypes.values()))
            } catch {
                setIssueTypes([])
            } finally {
                setLoadingIssueTypes(false)
            }
        }

        fetchIssueTypes()
    }, [selectedInstanceIds])

    const handleToggleInstance = (instanceId) => {
        setSelectedInstanceIds(prev =>
            prev.includes(instanceId)
                ? prev.filter(id => id !== instanceId)
                : [...prev, instanceId]
        )
    }

    const handleAddElement = () => {
        const trimmed = newElement.trim()
        if (trimmed && !elements.includes(trimmed)) {
            setElements([...elements, trimmed])
            setNewElement('')
        }
    }

    const handleRemoveElement = (index) => {
        setElements(elements.filter((_, i) => i !== index))
    }

    const handleElementKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddElement()
        }
        // Remove last element with Backspace on empty input
        if (e.key === 'Backspace' && newElement === '' && elements.length > 0) {
            setElements(elements.slice(0, -1))
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim() && elements.length > 0 && selectedInstanceIds.length > 0) {
            onSave({
                name: name.trim(),
                description: description.trim() || null,
                elements,
                parent_issue_type: parentIssueType,
                child_issue_type: childIssueType,
                instance_ids: selectedInstanceIds
            })
        }
    }

    if (!isOpen) return null

    const parentTypes = issueTypes.filter(t => !t.subtask)
    const childTypes = issueTypes

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-dark-700 animate-fade-in max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <h2 className="text-xl font-bold text-dark-100">
                        {template ? 'Modifica Template' : 'Nuovo Template'}
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
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Nome Template *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Es: Pacchetto Sviluppo"
                                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Descrizione
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Es: Template per attivita di sviluppo standard"
                                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                            />
                        </div>

                        {/* JIRA Instances */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Istanze JIRA *
                            </label>
                            {jiraInstances.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {jiraInstances.map(instance => {
                                        const isSelected = selectedInstanceIds.includes(instance.id)
                                        return (
                                            <button
                                                key={instance.id}
                                                type="button"
                                                onClick={() => handleToggleInstance(instance.id)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                                    isSelected
                                                        ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                                                        : 'bg-dark-700 text-dark-400 border-dark-600 hover:border-dark-500 hover:text-dark-300'
                                                }`}
                                            >
                                                {instance.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-dark-400">Nessuna istanza JIRA configurata</p>
                            )}
                        </div>

                        {/* Issue Types */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Tipo Issue Parent
                                </label>
                                {issueTypes.length > 0 ? (
                                    <select
                                        value={parentIssueType}
                                        onChange={(e) => setParentIssueType(e.target.value)}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    >
                                        {parentTypes.map(t => (
                                            <option key={t.id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-400 text-sm">
                                        {loadingIssueTypes ? 'Caricamento...' :
                                            selectedInstanceIds.length === 0 ? 'Seleziona un\'istanza' :
                                            'Testa la connessione JIRA per caricare i tipi'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Tipo Issue Figli
                                </label>
                                {issueTypes.length > 0 ? (
                                    <select
                                        value={childIssueType}
                                        onChange={(e) => setChildIssueType(e.target.value)}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    >
                                        {childTypes.map(t => (
                                            <option key={t.id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-400 text-sm">
                                        {loadingIssueTypes ? 'Caricamento...' :
                                            selectedInstanceIds.length === 0 ? 'Seleziona un\'istanza' :
                                            'Testa la connessione JIRA per caricare i tipi'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Elements - Tag/Chip Input */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Elementi Distintivi *
                            </label>
                            <p className="text-xs text-dark-400 mb-3">
                                Ogni elemento diventerà una issue figlia. Premi Enter per aggiungere.
                            </p>

                            <div
                                className="min-h-[48px] px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg flex flex-wrap gap-2 items-center cursor-text focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue/50"
                                onClick={() => elementInputRef.current?.focus()}
                            >
                                {elements.map((element, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-1 bg-accent-blue/20 text-accent-blue rounded-full px-3 py-1 text-sm"
                                    >
                                        {element}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveElement(index)
                                            }}
                                            className="ml-0.5 hover:text-white transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    ref={elementInputRef}
                                    type="text"
                                    value={newElement}
                                    onChange={(e) => setNewElement(e.target.value)}
                                    onKeyDown={handleElementKeyDown}
                                    placeholder={elements.length === 0 ? 'Aggiungi elemento...' : ''}
                                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-dark-100 placeholder-dark-400 text-sm py-1"
                                />
                            </div>

                            {elements.length === 0 && (
                                <p className="text-xs text-dark-500 mt-1.5">
                                    Aggiungi almeno un elemento distintivo
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || elements.length === 0 || selectedInstanceIds.length === 0 || loading}
                            className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvataggio...' : 'Salva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
