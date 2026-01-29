import { useState, useEffect } from 'react'
import { getSyncDefaults, getSyncStatus, syncWorklogsStream } from '../api/client'

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

    // Progress state
    const [progress, setProgress] = useState(null) // current event
    const [instanceStatuses, setInstanceStatuses] = useState({}) // instance_name -> status object

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
            setProgress(null)
            setInstanceStatuses({})

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
            setProgress(null)
            setInstanceStatuses({})

            const syncResult = await syncWorklogsStream(
                new Date(startDate),
                new Date(endDate),
                selectedInstances.length === instances.length ? null : selectedInstances,
                (event) => {
                    setProgress(event)

                    if (event.type === 'instance_start') {
                        setInstanceStatuses(prev => ({
                            ...prev,
                            [event.instance]: { status: 'in_progress', message: event.message }
                        }))
                    } else if (event.type === 'fetching_worklogs' || event.type === 'enriching' || event.type === 'saving') {
                        setInstanceStatuses(prev => ({
                            ...prev,
                            [event.instance]: { status: 'in_progress', message: event.message }
                        }))
                    } else if (event.type === 'worklogs_fetched') {
                        setInstanceStatuses(prev => ({
                            ...prev,
                            [event.instance]: { status: 'in_progress', message: event.message, count: event.count }
                        }))
                    } else if (event.type === 'instance_complete') {
                        setInstanceStatuses(prev => ({
                            ...prev,
                            [event.instance]: {
                                status: 'complete',
                                synced: event.synced,
                                updated: event.updated,
                                deleted: event.deleted,
                                message: event.message
                            }
                        }))
                    }
                }
            )

            setResult(syncResult)

            // Reload status
            const status = await getSyncStatus()
            setDataStatus(status)

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

    // Determine which instances to show in progress
    const instancesToShow = selectedInstances.length === instances.length
        ? instances.map(i => i.name)
        : selectedInstances

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={syncing ? undefined : onClose}
            />

            {/* Modal */}
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-dark-700 animate-fade-in max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div>
                        <h2 className="text-xl font-bold text-dark-100">Sincronizza Dati</h2>
                        <p className="text-sm text-dark-400 mt-1">
                            Scarica i worklog da JIRA
                        </p>
                    </div>
                    {!syncing && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                            <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                        </div>
                    ) : syncing ? (
                        /* Progress UI */
                        <div className="space-y-5">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-dark-100 mb-1">
                                    Sincronizzazione in corso...
                                </h3>
                                <p className="text-sm text-dark-400">
                                    Non chiudere questa finestra
                                </p>
                            </div>

                            {/* Progress bar */}
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-dark-300">Progresso</span>
                                    <span className="text-dark-100 font-mono font-medium">
                                        {progress?.percent ?? 0}%
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-primary rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${progress?.percent ?? 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Instance statuses */}
                            <div className="space-y-3">
                                {instancesToShow.map((instName) => {
                                    const status = instanceStatuses[instName]
                                    const isComplete = status?.status === 'complete'
                                    const isInProgress = status?.status === 'in_progress'

                                    return (
                                        <div
                                            key={instName}
                                            className={`p-3.5 rounded-lg border transition-colors ${
                                                isComplete
                                                    ? 'bg-accent-green/5 border-accent-green/30'
                                                    : isInProgress
                                                        ? 'bg-accent-blue/5 border-accent-blue/30'
                                                        : 'bg-dark-700/30 border-dark-600/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Status icon */}
                                                {isComplete ? (
                                                    <div className="w-5 h-5 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-3.5 h-3.5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                ) : isInProgress ? (
                                                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-blue/30 border-t-accent-blue"></div>
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-dark-500 flex-shrink-0" />
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium text-sm ${
                                                            isComplete ? 'text-accent-green' :
                                                            isInProgress ? 'text-dark-100' :
                                                            'text-dark-400'
                                                        }`}>
                                                            {instName}
                                                        </span>
                                                    </div>
                                                    {status?.message && (
                                                        <p className={`text-xs mt-0.5 ${isComplete ? 'text-accent-green/70' : 'text-dark-400'}`}>
                                                            {isComplete
                                                                ? `${status.synced} nuovi, ${status.updated} aggiornati, ${status.deleted} eliminati`
                                                                : status.message
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
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

                                    {/* Per-instance summary */}
                                    {Object.keys(instanceStatuses).length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-accent-green/20 space-y-1.5">
                                            {Object.entries(instanceStatuses).map(([name, st]) => (
                                                <div key={name} className="flex items-center justify-between text-xs">
                                                    <span className="text-dark-300">{name}</span>
                                                    <span className="text-dark-400">
                                                        {st.synced} nuovi, {st.updated} agg., {st.deleted} elim.
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Refresh Dashboard Button */}
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
                {!syncing && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                        >
                            {result ? 'Chiudi' : 'Annulla'}
                        </button>
                        {!result && (
                            <button
                                onClick={handleSync}
                                disabled={selectedInstances.length === 0}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Sincronizza
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
