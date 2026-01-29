import { useState, useEffect } from 'react'

export default function PackageTemplateModal({ isOpen, onClose, onSave, template, loading }) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [elements, setElements] = useState([])
    const [newElement, setNewElement] = useState('')
    const [parentIssueType, setParentIssueType] = useState('Task')
    const [childIssueType, setChildIssueType] = useState('Sub-task')

    useEffect(() => {
        if (template) {
            setName(template.name || '')
            setDescription(template.description || '')
            setElements(template.elements ? template.elements.map(e => typeof e === 'string' ? e : e.name) : [])
            setParentIssueType(template.parent_issue_type || 'Task')
            setChildIssueType(template.child_issue_type || 'Sub-task')
        } else {
            setName('')
            setDescription('')
            setElements([])
            setParentIssueType('Task')
            setChildIssueType('Sub-task')
        }
        setNewElement('')
    }, [template, isOpen])

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

    const handleMoveElement = (index, direction) => {
        const newElements = [...elements]
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= newElements.length) return
        ;[newElements[index], newElements[targetIndex]] = [newElements[targetIndex], newElements[index]]
        setElements(newElements)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddElement()
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim() && elements.length > 0) {
            onSave({
                name: name.trim(),
                description: description.trim() || null,
                elements,
                parent_issue_type: parentIssueType,
                child_issue_type: childIssueType
            })
        }
    }

    if (!isOpen) return null

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

                        {/* Issue Types */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Tipo Issue Parent
                                </label>
                                <input
                                    type="text"
                                    value={parentIssueType}
                                    onChange={(e) => setParentIssueType(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Tipo Issue Figli
                                </label>
                                <input
                                    type="text"
                                    value={childIssueType}
                                    onChange={(e) => setChildIssueType(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                />
                            </div>
                        </div>

                        {/* Elements */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Elementi Distintivi *
                            </label>
                            <p className="text-xs text-dark-400 mb-3">
                                Ogni elemento diventerà una issue figlia nel pacchetto
                            </p>

                            {/* Add element input */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newElement}
                                    onChange={(e) => setNewElement(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Es: Analisi, Sviluppo FE, Testing..."
                                    className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddElement}
                                    disabled={!newElement.trim()}
                                    className="px-4 py-2.5 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Aggiungi
                                </button>
                            </div>

                            {/* Element list */}
                            {elements.length > 0 ? (
                                <div className="space-y-1.5">
                                    {elements.map((element, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 group"
                                        >
                                            <span className="text-dark-400 text-xs font-mono w-5 text-center">
                                                {index + 1}
                                            </span>
                                            <span className="flex-1 text-dark-100 text-sm">
                                                {element}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveElement(index, -1)}
                                                    disabled={index === 0}
                                                    className="p-1 text-dark-400 hover:text-dark-200 disabled:opacity-30"
                                                    title="Sposta su"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveElement(index, 1)}
                                                    disabled={index === elements.length - 1}
                                                    className="p-1 text-dark-400 hover:text-dark-200 disabled:opacity-30"
                                                    title="Sposta giu"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveElement(index)}
                                                    className="p-1 text-dark-400 hover:text-accent-red"
                                                    title="Rimuovi"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-dark-400 text-sm">
                                    Nessun elemento aggiunto. Aggiungi almeno un elemento distintivo.
                                </div>
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
                            disabled={!name.trim() || elements.length === 0 || loading}
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
