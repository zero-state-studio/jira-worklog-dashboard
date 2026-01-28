import { useEffect } from 'react'

const levelColors = {
    DEBUG: 'text-dark-400 bg-dark-700',
    INFO: 'text-accent-blue bg-accent-blue/10',
    WARNING: 'text-accent-orange bg-accent-orange/10',
    ERROR: 'text-red-400 bg-red-400/10',
    CRITICAL: 'text-red-500 bg-red-500/20'
}

function JsonViewer({ data, title }) {
    if (!data) return null

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    return (
        <div className="mb-4">
            <h4 className="text-sm font-medium text-dark-300 mb-2">{title}</h4>
            <pre className="bg-dark-700/50 rounded-lg p-3 text-xs font-mono text-dark-200 overflow-x-auto max-h-64 overflow-y-auto">
                {content}
            </pre>
        </div>
    )
}

export default function LogDetailPanel({ log, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    if (!log) return null

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

    // Parse extra_data if it's a string
    let extraData = log.extra_data
    if (typeof extraData === 'string') {
        try {
            extraData = JSON.parse(extraData)
        } catch {
            // Keep as string
        }
    }

    const queryParams = extraData?.query_params
    const requestBody = extraData?.request_body
    const responseBody = extraData?.response_body

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-lg bg-dark-800 border-l border-dark-700 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <h3 className="text-lg font-semibold text-dark-100">Dettaglio Log</h3>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Basic Info */}
                    <div className="glass-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${levelColors[log.level] || ''}`}>
                                {log.level}
                            </span>
                            <span className={`text-sm font-mono ${
                                log.status_code >= 400 ? 'text-red-400' :
                                log.status_code >= 300 ? 'text-accent-orange' :
                                'text-accent-green'
                            }`}>
                                {log.status_code || '-'}
                            </span>
                        </div>

                        <div>
                            <div className="text-xs text-dark-400 mb-1">Timestamp</div>
                            <div className="text-sm text-dark-200 font-mono">{formatTimestamp(log.timestamp)}</div>
                        </div>

                        <div>
                            <div className="text-xs text-dark-400 mb-1">Endpoint</div>
                            <div className="text-sm text-dark-200 font-mono">
                                {log.method && <span className="text-accent-blue mr-2">{log.method}</span>}
                                {log.endpoint || '-'}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-dark-400 mb-1">Durata</div>
                            <div className="text-sm text-dark-200 font-mono">
                                {log.duration_ms ? `${log.duration_ms.toFixed(1)} ms` : '-'}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-dark-400 mb-1">Request ID</div>
                            <div className="text-sm text-dark-200 font-mono">{log.request_id || '-'}</div>
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <h4 className="text-sm font-medium text-dark-300 mb-2">Messaggio</h4>
                        <div className="bg-dark-700/50 rounded-lg p-3 text-sm text-dark-200">
                            {log.message}
                        </div>
                    </div>

                    {/* Query Params */}
                    {queryParams && Object.keys(queryParams).length > 0 && (
                        <JsonViewer data={queryParams} title="Query Parameters" />
                    )}

                    {/* Request Body */}
                    {requestBody && (
                        <JsonViewer data={requestBody} title="Request Body" />
                    )}

                    {/* Response Body */}
                    {responseBody && (
                        <JsonViewer data={responseBody} title="Response Body" />
                    )}

                    {/* Other Extra Data */}
                    {extraData && typeof extraData === 'object' && (
                        (() => {
                            const otherData = { ...extraData }
                            delete otherData.query_params
                            delete otherData.request_body
                            delete otherData.response_body
                            if (Object.keys(otherData).length > 0) {
                                return <JsonViewer data={otherData} title="Altri Dati" />
                            }
                            return null
                        })()
                    )}
                </div>
            </div>
        </div>
    )
}
