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
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={syncing ? undefined : onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-lg shadow-lg w-full max-w-lg mx-4 border border-solid animate-slide-up max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-solid">
                    <div>
                        <h2 className="text-xl font-bold text-primary">Sincronizza Dati</h2>
                        <p className="text-sm text-tertiary mt-1">
                            Scarica i worklog da JIRA
                        </p>
                    </div>
                    {!syncing && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-surface transition-colors"
                        >
                            <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <h3 className="text-lg font-semibold text-primary mb-1">
                                    Sincronizzazione in corso...
                                </h3>
                                <p className="text-sm text-tertiary">
                                    Non chiudere questa finestra
                                </p>
                            </div>

                            {/* Progress bar */}
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-secondary">Progresso</span>
                                    <span className="text-primary font-mono font-medium">
                                        {progress?.percent ?? 0}%
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
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
                                                        : 'bg-surface/30 border-solid/50'
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
                                                    <div className="w-5 h-5 rounded-full border-2 border-strong flex-shrink-0" />
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium text-sm ${
                                                            isComplete ? 'text-accent-green' :
                                                            isInProgress ? 'text-primary' :
                                                            'text-tertiary'
                                                        }`}>
                                                            {instName}
                                                        </span>
                                                    </div>
                                                    {status?.message && (
                                                        <p className={`text-xs mt-0.5 ${isComplete ? 'text-accent-green/70' : 'text-tertiary'}`}>
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
                                <div className="bg-surface/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className={`w-2 h-2 rounded-full ${dataStatus.has_data ? 'bg-accent-green' : 'bg-surface-secondary'}`} />
                                        <span className="text-secondary">
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
                                <label className="block text-sm font-medium text-secondary mb-2">
                                    Intervallo Date
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-tertiary mb-1">Da</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-surface border border-solid rounded-lg text-primary focus:outline-none focus:border-focus"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-tertiary mb-1">A</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-surface border border-solid rounded-lg text-primary focus:outline-none focus:border-focus"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Instance Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-secondary">
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
                                                    : 'border-solid hover:border-strong'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedInstances.includes(inst.name)}
                                                onChange={() => toggleInstance(inst.name)}
                                                className="w-4 h-4 rounded border-strong"
                                            />
                                            <div>
                                                <div className="text-primary font-medium">{inst.name}</div>
                                                <div className="text-xs text-tertiary">{inst.url}</div>
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
                                            <div className="text-lg font-bold text-primary">{result.worklogs_synced}</div>
                                            <div className="text-tertiary">Nuovi</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-primary">{result.worklogs_updated}</div>
                                            <div className="text-tertiary">Aggiornati</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-primary">{result.worklogs_deleted}</div>
                                            <div className="text-tertiary">Eliminati</div>
                                        </div>
                                    </div>

                                    {/* Per-instance summary */}
                                    {Object.keys(instanceStatuses).length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-accent-green/20 space-y-1.5">
                                            {Object.entries(instanceStatuses).map(([name, st]) => (
                                                <div key={name} className="flex items-center justify-between text-xs">
                                                    <span className="text-secondary">{name}</span>
                                                    <span className="text-tertiary">
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
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-solid">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                        >
                            {result ? 'Chiudi' : 'Annulla'}
                        </button>
                        {!result && (
                            <button
                                onClick={handleSync}
                                disabled={selectedInstances.length === 0}
                                className="flex items-center gap-2 px-5 py-2 bg-accent text-inverse font-medium rounded-md hover:bg-accent-hover transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
