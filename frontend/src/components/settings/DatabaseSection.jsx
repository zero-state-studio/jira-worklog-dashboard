import { useState } from 'react'
import { clearAllWorklogs } from '../../api/client'

const TrashIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const WarningIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
)

export default function DatabaseSection() {
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(null)
    const [error, setError] = useState(null)

    const handleClearWorklogs = async () => {
        if (confirmText !== 'ELIMINA') {
            return
        }

        try {
            setLoading(true)
            setError(null)
            const result = await clearAllWorklogs()

            setSuccess(`✅ ${result.deleted_count} worklogs eliminati con successo`)
            setShowConfirmModal(false)
            setConfirmText('')

            // Hide success message after 5 seconds
            setTimeout(() => setSuccess(null), 5000)
        } catch (err) {
            setError(err.message || 'Errore durante l\'eliminazione dei worklogs')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-primary mb-2">Gestione Database</h2>
                <p className="text-tertiary text-sm">
                    Strumenti per la gestione dei dati (solo dev/test)
                </p>
            </div>

            {success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
                    {success}
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-error text-sm">
                    {error}
                </div>
            )}

            {/* Clear Worklogs Section */}
            <div className="glass-card p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                        <TrashIcon />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-primary mb-1">
                            Pulisci Tutti i Worklogs
                        </h3>
                        <p className="text-tertiary text-sm mb-4">
                            Elimina tutti i worklogs della tua azienda dal database.
                            Utile per testing e development.
                        </p>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                            <p className="text-orange-300 text-xs">
                                <strong>⚠️ Attenzione:</strong> Questa azione elimina TUTTI i worklogs
                                della tua azienda in modo permanente. Non è reversibile!
                            </p>
                        </div>
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <TrashIcon />
                            Pulisci Worklogs
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center py-8">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setShowConfirmModal(false)} />
                    <div className="relative bg-surface rounded-lg shadow-lg w-full max-w-md mx-4 border border-solid max-h-[calc(100vh-4rem)] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-solid">
                            <div className="flex items-center gap-3 text-error">
                                <WarningIcon />
                                <h3 className="text-lg font-semibold">
                                    Conferma Eliminazione
                                </h3>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                <p className="text-red-300 text-sm font-medium mb-2">
                                    ⚠️ ATTENZIONE: Operazione Irreversibile!
                                </p>
                                <p className="text-error text-sm">
                                    Stai per eliminare <strong>TUTTI i worklogs</strong> della tua azienda.
                                    Questa azione non può essere annullata.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                    Per confermare, scrivi <strong className="text-error">ELIMINA</strong>:
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Scrivi ELIMINA"
                                    className="w-full px-4 py-3 bg-surface border border-solid rounded-lg text-primary placeholder-tertiary focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-solid">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmModal(false)
                                    setConfirmText('')
                                }}
                                disabled={loading}
                                className="px-4 py-2 text-secondary hover:text-primary transition-colors disabled:opacity-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleClearWorklogs}
                                disabled={confirmText !== 'ELIMINA' || loading}
                                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Eliminazione...
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon />
                                        Elimina Tutto
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
