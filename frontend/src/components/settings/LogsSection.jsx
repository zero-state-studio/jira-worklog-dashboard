import { useState, useEffect, useCallback, useRef } from 'react'
import { getLogs, getLogStats, downloadLogs, deleteOldLogs } from '../../api/client'
import LogDetailPanel from './LogDetailPanel'

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
)

const RefreshIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
)

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const levelColors = {
    DEBUG: 'text-dark-400 bg-dark-700',
    INFO: 'text-accent-blue bg-accent-blue/10',
    WARNING: 'text-accent-orange bg-accent-orange/10',
    ERROR: 'text-red-400 bg-red-400/10',
    CRITICAL: 'text-red-500 bg-red-500/20'
}

export default function LogsSection() {
    const [logs, setLogs] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filters
    const [level, setLevel] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [endpoint, setEndpoint] = useState('')

    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(false)

    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteDays, setDeleteDays] = useState(30)

    // Selected log for detail panel
    const [selectedLog, setSelectedLog] = useState(null)

    // Export dropdown
    const [showExportMenu, setShowExportMenu] = useState(false)
    const exportMenuRef = useRef(null)

    const loadLogs = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [logsData, statsData] = await Promise.all([
                getLogs({
                    page,
                    pageSize: 50,
                    level: level || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    endpoint: endpoint || undefined
                }),
                getLogStats()
            ])

            setLogs(logsData.logs)
            setTotalPages(logsData.total_pages)
            setTotal(logsData.total)
            setStats(statsData)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [page, level, startDate, endDate, endpoint])

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) return

        const interval = setInterval(loadLogs, 30000) // 30 seconds
        return () => clearInterval(interval)
    }, [autoRefresh, loadLogs])

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleDownload = async (format) => {
        try {
            setError(null)
            await downloadLogs(format, {
                level: level || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                endpoint: endpoint || undefined
            })
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async () => {
        try {
            setDeleteLoading(true)
            setError(null)
            await deleteOldLogs(deleteDays)
            setDeleteConfirm(false)
            await loadLogs()
        } catch (err) {
            setError(err.message)
        } finally {
            setDeleteLoading(false)
        }
    }

    const handleFilterChange = () => {
        setPage(1) // Reset to first page when filters change
    }

    const formatTimestamp = (ts) => {
        if (!ts) return '-'
        return new Date(ts).toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards - Clickable for filtering */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div
                        onClick={() => { setLevel(''); handleFilterChange(); }}
                        className={`glass-card p-4 cursor-pointer transition-all hover:bg-dark-700/50 ${
                            level === '' ? 'ring-2 ring-accent-blue' : ''
                        }`}
                    >
                        <div className="text-2xl font-bold text-dark-100">{stats.total}</div>
                        <div className="text-sm text-dark-400">Totale Log</div>
                    </div>
                    {Object.entries(stats.by_level || {}).map(([lvl, count]) => (
                        <div
                            key={lvl}
                            onClick={() => { setLevel(lvl); handleFilterChange(); }}
                            className={`glass-card p-4 cursor-pointer transition-all hover:bg-dark-700/50 ${
                                level === lvl ? 'ring-2 ring-accent-blue' : ''
                            }`}
                        >
                            <div className="text-2xl font-bold text-dark-100">{count}</div>
                            <div className={`text-sm ${levelColors[lvl]?.split(' ')[0] || 'text-dark-400'}`}>{lvl}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs text-dark-400 mb-1">Livello</label>
                        <select
                            value={level}
                            onChange={(e) => { setLevel(e.target.value); handleFilterChange(); }}
                            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue"
                        >
                            <option value="">Tutti</option>
                            <option value="DEBUG">DEBUG</option>
                            <option value="INFO">INFO</option>
                            <option value="WARNING">WARNING</option>
                            <option value="ERROR">ERROR</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-dark-400 mb-1">Da</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
                            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-dark-400 mb-1">A</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
                            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue"
                        />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-dark-400 mb-1">Endpoint</label>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={(e) => { setEndpoint(e.target.value); handleFilterChange(); }}
                            placeholder="/api/..."
                            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent-blue focus:ring-accent-blue/50"
                            />
                            <span className="text-sm text-dark-300">Auto-refresh</span>
                        </label>
                    </div>

                    <button
                        onClick={loadLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-600 text-dark-200 rounded-lg hover:bg-dark-500 transition-colors disabled:opacity-50"
                    >
                        <RefreshIcon />
                        Aggiorna
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-dark-400">
                    {total} log trovati
                </div>
                <div className="flex items-center gap-2">
                    {/* Export Dropdown */}
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition-colors text-sm"
                        >
                            <DownloadIcon />
                            Esporta
                            <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 mt-1 w-32 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 overflow-hidden">
                                <button
                                    onClick={() => { handleDownload('json'); setShowExportMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-sm text-dark-200 hover:bg-dark-600 transition-colors"
                                >
                                    JSON
                                </button>
                                <button
                                    onClick={() => { handleDownload('csv'); setShowExportMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-sm text-dark-200 hover:bg-dark-600 transition-colors"
                                >
                                    CSV
                                </button>
                                <button
                                    onClick={() => { handleDownload('txt'); setShowExportMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-sm text-dark-200 hover:bg-dark-600 transition-colors"
                                >
                                    TXT
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setDeleteConfirm(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
                    >
                        <TrashIcon />
                        Pulisci vecchi
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-16 text-dark-400">
                        Nessun log trovato
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-dark-700/50">
                                    <th className="table-header">Timestamp</th>
                                    <th className="table-header">Livello</th>
                                    <th className="table-header">Endpoint</th>
                                    <th className="table-header">Messaggio</th>
                                    <th className="table-header text-right">Durata</th>
                                    <th className="table-header text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className="hover:bg-dark-700/30 transition-colors cursor-pointer"
                                    >
                                        <td className="table-cell whitespace-nowrap text-dark-400 font-mono text-xs">
                                            {formatTimestamp(log.timestamp)}
                                        </td>
                                        <td className="table-cell">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${levelColors[log.level] || ''}`}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td className="table-cell text-dark-300 font-mono text-xs">
                                            {log.method && <span className="text-accent-blue mr-1">{log.method}</span>}
                                            {log.endpoint || '-'}
                                        </td>
                                        <td className="table-cell text-dark-200 max-w-md truncate" title={log.message}>
                                            {log.message}
                                        </td>
                                        <td className="table-cell text-right text-dark-400 font-mono text-xs">
                                            {log.duration_ms ? `${log.duration_ms.toFixed(1)}ms` : '-'}
                                        </td>
                                        <td className="table-cell text-center">
                                            {log.status_code && (
                                                <span className={`text-xs font-mono ${
                                                    log.status_code >= 400 ? 'text-red-400' :
                                                    log.status_code >= 300 ? 'text-accent-orange' :
                                                    'text-accent-green'
                                                }`}>
                                                    {log.status_code}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Precedente
                    </button>
                    <span className="text-dark-400 px-4">
                        Pagina {page} di {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Successiva
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(false)}
                    />
                    <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-dark-700 p-6">
                        <h3 className="text-lg font-semibold text-dark-100 mb-4">
                            Elimina log
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm text-dark-300 mb-2">
                                Elimina log più vecchi di:
                            </label>
                            <select
                                value={deleteDays}
                                onChange={(e) => setDeleteDays(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue"
                            >
                                <option value={30}>30 giorni</option>
                                <option value={21}>21 giorni</option>
                                <option value={7}>7 giorni</option>
                                <option value={1}>1 giorno</option>
                                <option value={0}>Tutti i log</option>
                            </select>
                        </div>

                        <p className="text-dark-400 text-sm mb-6">
                            {deleteDays === 0
                                ? 'Verranno eliminati TUTTI i log. Questa operazione non può essere annullata.'
                                : `Verranno eliminati tutti i log più vecchi di ${deleteDays} giorni. Questa operazione non può essere annullata.`
                            }
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {deleteLoading ? 'Eliminazione...' : 'Elimina'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Detail Panel */}
            {selectedLog && (
                <LogDetailPanel
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    )
}
