import { useState, useEffect } from 'react'
import { getPackageTemplates, createPackageTemplate, updatePackageTemplate, deletePackageTemplate } from '../../api/client'
import PackageTemplateModal from './PackageTemplateModal'

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

const PackageIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
)

export default function PackageTemplatesSection() {
    const [templates, setTemplates] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const fetchTemplates = async () => {
        try {
            const data = await getPackageTemplates()
            setTemplates(data.templates || [])
        } catch (err) {
            setError(err.message)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const handleCreate = () => {
        setEditingTemplate(null)
        setModalOpen(true)
    }

    const handleEdit = (template) => {
        setEditingTemplate(template)
        setModalOpen(true)
    }

    const handleSave = async (data) => {
        try {
            setLoading(true)
            setError(null)

            if (editingTemplate) {
                await updatePackageTemplate(editingTemplate.id, data)
            } else {
                await createPackageTemplate(data)
            }

            setModalOpen(false)
            setEditingTemplate(null)
            await fetchTemplates()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (templateId) => {
        try {
            setLoading(true)
            setError(null)
            await deletePackageTemplate(templateId)
            setDeleteConfirm(null)
            await fetchTemplates()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-primary">Template Pacchetti</h3>
                    <p className="text-sm text-tertiary mt-1">
                        Configura i template per la creazione di pacchetti di issue JIRA
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg  hover:opacity-90 transition-opacity"
                >
                    <PlusIcon />
                    Nuovo Template
                </button>
            </div>

            {error && (
                <div className="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
                    {error}
                </div>
            )}

            {/* Templates list */}
            {templates.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-surface flex items-center justify-center">
                        <PackageIcon />
                    </div>
                    <h4 className="text-lg font-medium text-secondary mb-2">Nessun template</h4>
                    <p className="text-tertiary text-sm mb-4">
                        Crea il primo template per iniziare a creare pacchetti di issue
                    </p>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors"
                    >
                        Crea Template
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="glass-card p-5 hover:border-solid transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-accent-purple/10">
                                            <PackageIcon />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-primary">{template.name}</h4>
                                            {template.description && (
                                                <p className="text-sm text-tertiary">{template.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Instance badges */}
                                    {template.instances && template.instances.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3 ml-12">
                                            {template.instances.map((inst) => (
                                                <span
                                                    key={inst.id}
                                                    className="px-2.5 py-1 text-xs font-medium bg-accent-blue/10 text-accent-blue rounded-full border border-accent-blue/20"
                                                >
                                                    {inst.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Elements badges */}
                                    <div className="flex flex-wrap gap-1.5 mt-2 ml-12">
                                        {template.elements.map((element, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2.5 py-1 text-xs font-medium bg-surface text-secondary rounded-full border border-solid"
                                            >
                                                {typeof element === 'string' ? element : element.name}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Issue type info */}
                                    <div className="flex items-center gap-4 mt-2 ml-12 text-xs text-tertiary">
                                        <span>Parent: <span className="text-secondary">{template.parent_issue_type}</span></span>
                                        <span>Figli: <span className="text-secondary">{template.child_issue_type}</span></span>
                                        <span>{template.elements.length} elementi</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 rounded-lg text-tertiary hover:text-primary hover:bg-surface transition-colors"
                                        title="Modifica"
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(template)}
                                        className="p-2 rounded-lg text-tertiary hover:text-accent-red hover:bg-surface transition-colors"
                                        title="Elimina"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Modal */}
            <PackageTemplateModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingTemplate(null) }}
                onSave={handleSave}
                template={editingTemplate}
                loading={loading}
            />

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative bg-surface rounded-lg shadow-lg w-full max-w-sm mx-4 border border-solid p-6 animate-slide-up">
                        <h3 className="text-lg font-bold text-primary mb-2">Conferma Eliminazione</h3>
                        <p className="text-secondary text-sm mb-6">
                            Eliminare il template "<span className="text-primary">{deleteConfirm.name}</span>"?
                            Questa azione non puo essere annullata.
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
                                className="px-4 py-2 bg-accent-red text-white rounded-lg hover:bg-accent-red/80 transition-colors disabled:opacity-50"
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
