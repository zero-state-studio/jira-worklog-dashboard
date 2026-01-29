import { useState, useEffect } from 'react'
import { getPackageTemplates, getJiraProjects, getJiraIssueTypes, createPackage, getJiraInstances } from '../api/client'

const PackageIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
)

const CheckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
)

const StepIndicator = ({ steps, currentStep }) => (
    <div className="flex items-center gap-2 px-6 py-4 border-b border-dark-700">
        {steps.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <div className={`w-8 h-0.5 ${idx <= currentStep ? 'bg-accent-blue' : 'bg-dark-600'}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                    idx === currentStep ? 'text-accent-blue' :
                    idx < currentStep ? 'text-accent-green' : 'text-dark-400'
                }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        idx === currentStep ? 'bg-accent-blue/20 border border-accent-blue' :
                        idx < currentStep ? 'bg-accent-green/20 border border-accent-green' :
                        'bg-dark-700 border border-dark-600'
                    }`}>
                        {idx < currentStep ? <CheckIcon /> : idx + 1}
                    </div>
                    <span className="hidden sm:inline">{label}</span>
                </div>
            </div>
        ))}
    </div>
)

export default function CreatePackageModal({ isOpen, onClose, jiraInstances: propInstances }) {
    const [step, setStep] = useState(0)
    const [templates, setTemplates] = useState([])
    const [instances, setInstances] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Step 1: Template & Instance selection
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [selectedInstances, setSelectedInstances] = useState([])

    // Step 2: Parent issue config
    const [projects, setProjects] = useState([])
    const [issueTypes, setIssueTypes] = useState([])
    const [projectKey, setProjectKey] = useState('')
    const [parentSummary, setParentSummary] = useState('')
    const [parentDescription, setParentDescription] = useState('')
    const [parentIssueType, setParentIssueType] = useState('')

    // Step 3: Element selection
    const [selectedElements, setSelectedElements] = useState([])
    const [childIssueType, setChildIssueType] = useState('')

    // Step 4: Result
    const [result, setResult] = useState(null)

    const stepLabels = ['Template', 'Parent', 'Elementi', 'Risultato']

    // Load templates and instances on open
    useEffect(() => {
        if (isOpen) {
            loadInitialData()
            resetForm()
        }
    }, [isOpen])

    const resetForm = () => {
        setStep(0)
        setSelectedTemplate(null)
        setSelectedInstances([])
        setProjectKey('')
        setParentSummary('')
        setParentDescription('')
        setParentIssueType('')
        setSelectedElements([])
        setChildIssueType('')
        setResult(null)
        setError(null)
        setProjects([])
        setIssueTypes([])
    }

    const loadInitialData = async () => {
        try {
            setLoading(true)
            const [templatesData, instancesData] = await Promise.all([
                getPackageTemplates(),
                getJiraInstances()
            ])
            setTemplates(templatesData.templates || [])
            setInstances(instancesData.instances || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Load projects when instances change
    const loadProjects = async (instanceName) => {
        try {
            setLoading(true)
            const data = await getJiraProjects(instanceName)
            setProjects(data.projects || [])
        } catch (err) {
            setError(`Errore caricamento progetti: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // Load issue types when project changes
    const loadIssueTypes = async (instanceName, projKey) => {
        try {
            const data = await getJiraIssueTypes(instanceName, projKey)
            setIssueTypes(data.issue_types || [])
        } catch (err) {
            console.error('Error loading issue types:', err)
        }
    }

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template)
        setParentIssueType(template.parent_issue_type || 'Task')
        setChildIssueType(template.child_issue_type || 'Sub-task')
        // Pre-select all elements
        const elementNames = template.elements.map(e => typeof e === 'string' ? e : e.name)
        setSelectedElements(elementNames)
    }

    const handleInstanceToggle = (instanceName) => {
        setSelectedInstances(prev =>
            prev.includes(instanceName)
                ? prev.filter(n => n !== instanceName)
                : [...prev, instanceName]
        )
    }

    const handleElementToggle = (element) => {
        setSelectedElements(prev =>
            prev.includes(element)
                ? prev.filter(e => e !== element)
                : [...prev, element]
        )
    }

    const handleNextStep = async () => {
        if (step === 0) {
            // Going to Step 2: load projects from first selected instance
            if (selectedInstances.length > 0) {
                await loadProjects(selectedInstances[0])
            }
            setStep(1)
        } else if (step === 1) {
            setStep(2)
        } else if (step === 2) {
            // Submit
            await handleCreate()
        }
    }

    const handleProjectChange = async (projKey) => {
        setProjectKey(projKey)
        if (projKey && selectedInstances.length > 0) {
            await loadIssueTypes(selectedInstances[0], projKey)
        }
    }

    const handleCreate = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await createPackage({
                template_id: selectedTemplate?.id,
                jira_instances: selectedInstances,
                project_key: projectKey,
                parent_summary: parentSummary,
                parent_description: parentDescription || null,
                parent_issue_type: parentIssueType,
                child_issue_type: childIssueType,
                selected_elements: selectedElements
            })

            setResult(response)
            setStep(3)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const canGoNext = () => {
        switch (step) {
            case 0: return selectedTemplate && selectedInstances.length > 0
            case 1: return projectKey && parentSummary.trim() && parentIssueType
            case 2: return selectedElements.length > 0
            default: return false
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={step === 3 ? onClose : undefined}
            />

            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-dark-700 animate-fade-in max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-purple/10 text-accent-purple">
                            <PackageIcon />
                        </div>
                        <h2 className="text-xl font-bold text-dark-100">Crea Pacchetto Issue</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Step Indicator */}
                <StepIndicator steps={stepLabels} currentStep={step} />

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 0: Template & Instance */}
                    {step === 0 && (
                        <div className="space-y-6">
                            {/* Template selection */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-3">
                                    Seleziona Template
                                </label>
                                {templates.length === 0 ? (
                                    <div className="text-center py-8 text-dark-400 text-sm">
                                        Nessun template disponibile. Creane uno in Impostazioni &gt; Pacchetti.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {templates.map(template => (
                                            <button
                                                key={template.id}
                                                onClick={() => handleTemplateSelect(template)}
                                                className={`w-full text-left p-4 rounded-lg border transition-all ${
                                                    selectedTemplate?.id === template.id
                                                        ? 'bg-accent-blue/10 border-accent-blue'
                                                        : 'bg-dark-700 border-dark-600 hover:border-dark-500'
                                                }`}
                                            >
                                                <div className="font-medium text-dark-100">{template.name}</div>
                                                {template.description && (
                                                    <div className="text-xs text-dark-400 mt-1">{template.description}</div>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {template.elements.map((el, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 text-xs bg-dark-600 text-dark-300 rounded">
                                                            {typeof el === 'string' ? el : el.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Instance selection */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-3">
                                    Istanze JIRA
                                </label>
                                <div className="space-y-2">
                                    {instances.map(inst => (
                                        <label
                                            key={inst.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedInstances.includes(inst.name)
                                                    ? 'bg-accent-blue/10 border-accent-blue'
                                                    : 'bg-dark-700 border-dark-600 hover:border-dark-500'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedInstances.includes(inst.name)}
                                                onChange={() => handleInstanceToggle(inst.name)}
                                                className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent-blue focus:ring-accent-blue/50"
                                            />
                                            <div>
                                                <div className="font-medium text-dark-100">{inst.name}</div>
                                                <div className="text-xs text-dark-400">{inst.url}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Parent Issue Config */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Project */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Progetto *
                                </label>
                                {loading ? (
                                    <div className="flex items-center gap-2 text-dark-400 text-sm py-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue"></div>
                                        Caricamento progetti...
                                    </div>
                                ) : (
                                    <select
                                        value={projectKey}
                                        onChange={(e) => handleProjectChange(e.target.value)}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    >
                                        <option value="">Seleziona progetto...</option>
                                        {projects.map(p => (
                                            <option key={p.key} value={p.key}>{p.key} - {p.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Parent Issue Type */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Tipo Issue Parent *
                                </label>
                                {issueTypes.length > 0 ? (
                                    <select
                                        value={parentIssueType}
                                        onChange={(e) => setParentIssueType(e.target.value)}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    >
                                        {issueTypes.filter(t => !t.subtask).map(t => (
                                            <option key={t.id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={parentIssueType}
                                        onChange={(e) => setParentIssueType(e.target.value)}
                                        placeholder="Es: Task, Story, Epic..."
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    />
                                )}
                            </div>

                            {/* Summary */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Titolo Issue Parent *
                                </label>
                                <input
                                    type="text"
                                    value={parentSummary}
                                    onChange={(e) => setParentSummary(e.target.value)}
                                    placeholder="Es: Sprint 42 - Feature Login"
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Descrizione (opzionale)
                                </label>
                                <textarea
                                    value={parentDescription}
                                    onChange={(e) => setParentDescription(e.target.value)}
                                    placeholder="Descrizione della issue parent..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Element Selection */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Child Issue Type */}
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
                                        {issueTypes.map(t => (
                                            <option key={t.id} value={t.name}>{t.name}{t.subtask ? ' (Sub-task)' : ''}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={childIssueType}
                                        onChange={(e) => setChildIssueType(e.target.value)}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                    />
                                )}
                            </div>

                            {/* Elements */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-dark-300">
                                        Seleziona Elementi ({selectedElements.length}/{selectedTemplate?.elements.length || 0})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allElements = (selectedTemplate?.elements || []).map(e => typeof e === 'string' ? e : e.name)
                                            setSelectedElements(
                                                selectedElements.length === allElements.length ? [] : allElements
                                            )
                                        }}
                                        className="text-xs text-accent-blue hover:text-accent-blue/80"
                                    >
                                        {selectedElements.length === (selectedTemplate?.elements || []).length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {(selectedTemplate?.elements || []).map((el, idx) => {
                                        const elName = typeof el === 'string' ? el : el.name
                                        const isSelected = selectedElements.includes(elName)
                                        return (
                                            <label
                                                key={idx}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-accent-blue/10 border-accent-blue'
                                                        : 'bg-dark-700 border-dark-600 hover:border-dark-500'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleElementToggle(elName)}
                                                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent-blue focus:ring-accent-blue/50"
                                                />
                                                <span className="text-dark-400 text-xs font-mono w-5">{idx + 1}</span>
                                                <span className="text-dark-100">{elName}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Summary preview */}
                            <div className="mt-4 p-4 bg-dark-900 rounded-lg border border-dark-700">
                                <h4 className="text-sm font-medium text-dark-300 mb-2">Riepilogo</h4>
                                <div className="text-sm text-dark-200 space-y-1">
                                    <div>Istanze: <span className="text-accent-blue">{selectedInstances.join(', ')}</span></div>
                                    <div>Progetto: <span className="text-accent-blue">{projectKey}</span></div>
                                    <div>Parent: <span className="text-dark-100">{parentSummary}</span> ({parentIssueType})</div>
                                    <div>Figli: <span className="text-accent-green">{selectedElements.length}</span> issue ({childIssueType})</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Result */}
                    {step === 3 && result && (
                        <div className="space-y-4">
                            {result.success ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-green/20 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-dark-100">Pacchetto Creato!</h3>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-red/20 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-dark-100">Creazione Fallita</h3>
                                </div>
                            )}

                            {/* Results per instance */}
                            {result.results.map((r, idx) => (
                                <div key={idx} className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-sm font-medium text-accent-blue">{r.jira_instance}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-dark-400">Parent:</span>
                                            <span className="font-mono text-sm text-accent-green font-medium">{r.parent_key}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-dark-400">Figli:</span>
                                            <div className="mt-1 space-y-1">
                                                {r.children.map((child, cidx) => (
                                                    <div key={cidx} className="flex items-center gap-2 text-sm">
                                                        <span className="font-mono text-accent-green">{child.key}</span>
                                                        <span className="text-dark-300">{child.summary}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Errors */}
                            {result.errors && result.errors.length > 0 && (
                                <div className="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg">
                                    <h4 className="text-sm font-medium text-accent-red mb-2">Errori:</h4>
                                    <ul className="text-sm text-accent-red/80 space-y-1">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-dark-700">
                    <div>
                        {step > 0 && step < 3 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                            >
                                Indietro
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {step === 3 ? (
                            <button
                                onClick={onClose}
                                className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity"
                            >
                                Chiudi
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleNextStep}
                                    disabled={!canGoNext() || loading}
                                    className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                    {step === 2 ? 'Crea Pacchetto' : 'Avanti'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
