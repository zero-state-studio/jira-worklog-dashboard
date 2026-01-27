import { useState, useEffect } from 'react'
import { format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { getSyncDefaults, getSyncStatus, syncWorklogs } from '../api/client'

export default function SyncModal({ isOpen, onClose, onSyncComplete }) {
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)
    const [showRefreshButton, setShowRefreshButton] = useState(false)

    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [instances, setInstances] = useState([])
    const [selectedInstances, setSelectedInstances] = useState([])
    const [dataStatus, setDataStatus] = useState(null)

    useEffect(() => {
        if (isOpen) {
            loadDefaults()
        }
    }, [isOpen])

    const loadDefaults = async () => {
        try {
            setLoading(true)
            setError(null)
            setResult(null)
            setShowRefreshButton(false)

            const [defaults, status] = await Promise.all([
                getSyncDefaults(),
                getSyncStatus()
            ])

            setStartDate(defaults.default_start_date)
            setEndDate(defaults.default_end_date)
            setInstances(defaults.available_instances)
            setSelectedInstances(defaults.available_instances.map(i => i.name))
            setDataStatus(status)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSync = async () => {
        try {
            setSyncing(true)
            setError(null)
            setResult(null)
            setShowRefreshButton(false)

            const syncResult = await syncWorklogs(
                new Date(startDate),
                new Date(endDate),
                selectedInstances.length === instances.length ? null : selectedInstances
            )

            setResult(syncResult)

            // Reload status
            const status = await getSyncStatus()
            setDataStatus(status)

            // Show refresh button after 3 seconds (instead of auto-refreshing)
            setTimeout(() => {
                setShowRefreshButton(true)
            }, 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setSyncing(false)
        }
    }

    const handleRefreshDashboard = () => {
        if (onSyncComplete) {
            onSyncComplete(result)
        }
    }

    const toggleInstance = (name) => {
        setSelectedInstances(prev => {
            if (prev.includes(name)) {
                return prev.filter(n => n !== name)
            } else {
                return [...prev, name]
            }
        })
    }

    const selectAllInstances = () => {
        setSelectedInstances(instances.map(i => i.name))
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
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-dark-700 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div>
                        <h2 className="text-xl font-bold text-dark-100">Sincronizza Dati</h2>
                        <p className="text-sm text-dark-400 mt-1">
                            Scarica i worklog da JIRA
                        </p>
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

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                        </div>
                    ) : (
                        <>
                            {/* Data Status */}
                            {dataStatus && (
                                <div className="bg-dark-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className={`w-2 h-2 rounded-full ${dataStatus.has_data ? 'bg-accent-green' : 'bg-dark-500'}`} />
                                        <span className="text-dark-300">
                                            {dataStatus.has_data
                                                ? `${dataStatus.total_worklogs} worklog salvati (${dataStatus.date_range_start} → ${dataStatus.date_range_end})`
                                                : 'Nessun dato salvato - esegui la prima sincronizzazione'
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Date Range */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Intervallo Date
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-dark-400 mb-1">Da</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-dark-400 mb-1">A</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Instance Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-dark-300">
                                        Istanze JIRA
                                    </label>
                                    <button
                                        onClick={selectAllInstances}
                                        className="text-xs text-accent-blue hover:underline"
                                    >
                                        Seleziona tutte
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {instances.map((inst) => (
                                        <label
                                            key={inst.name}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedInstances.includes(inst.name)
                                                    ? 'border-accent-blue bg-accent-blue/10'
                                                    : 'border-dark-600 hover:border-dark-500'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedInstances.includes(inst.name)}
                                                onChange={() => toggleInstance(inst.name)}
                                                className="w-4 h-4 rounded border-dark-500"
                                            />
                                            <div>
                                                <div className="text-dark-100 font-medium">{inst.name}</div>
                                                <div className="text-xs text-dark-400">{inst.url}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Result */}
                            {result && (
                                <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-accent-green font-medium mb-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Sincronizzazione completata
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-dark-100">{result.worklogs_synced}</div>
                                            <div className="text-dark-400">Nuovi</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-dark-100">{result.worklogs_updated}</div>
                                            <div className="text-dark-400">Aggiornati</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-dark-100">{result.worklogs_deleted}</div>
                                            <div className="text-dark-400">Eliminati</div>
                                        </div>
                                    </div>

                                    {/* Refresh Dashboard Button - appears after 3 seconds */}
                                    {showRefreshButton && (
                                        <div className="mt-4 pt-4 border-t border-accent-green/30">
                                            <button
                                                onClick={handleRefreshDashboard}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-green/20 text-accent-green font-medium rounded-lg hover:bg-accent-green/30 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Aggiorna Dashboard
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                    >
                        {result ? 'Chiudi' : 'Annulla'}
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={syncing || selectedInstances.length === 0}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {syncing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Sincronizzazione...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Sincronizza
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
