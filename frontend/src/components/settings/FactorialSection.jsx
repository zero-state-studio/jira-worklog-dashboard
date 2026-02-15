import { useState, useEffect } from 'react'
import {
    getFactorialConfig,
    setFactorialConfig,
    bulkFetchFactorialEmployees
} from '../../api/client'

export default function FactorialSection() {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [error, setError] = useState(null)
    const [bulkFetchStatus, setBulkFetchStatus] = useState(null)

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            setLoading(true)
            const data = await getFactorialConfig()
            setConfig(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            setError(null)
            await setFactorialConfig(apiKey)
            setEditing(false)
            setApiKey('')
            await loadConfig()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleBulkFetch = async () => {
        try {
            setBulkFetchStatus('loading')
            const result = await bulkFetchFactorialEmployees()
            setBulkFetchStatus(result)
            setTimeout(() => setBulkFetchStatus(null), 5000)
        } catch (err) {
            setError(err.message)
            setBulkFetchStatus(null)
        }
    }

    if (loading && !config) {
        return (
            <div className="glass-card p-6">
                <div className="text-dark-400">Caricamento...</div>
            </div>
        )
    }

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-dark-100">
                        Integrazione Factorial HR
                    </h2>
                    <p className="text-sm text-dark-400 mt-1">
                        Gestisci ferie e permessi tramite Factorial
                    </p>
                </div>
                {config?.configured && !editing && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkFetch}
                            disabled={bulkFetchStatus === 'loading'}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {bulkFetchStatus === 'loading' ? 'Ricerca...' : 'Fetch Employee IDs'}
                        </button>
                        <button
                            onClick={() => setEditing(true)}
                            className="px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition-colors"
                        >
                            Modifica
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {bulkFetchStatus && bulkFetchStatus !== 'loading' && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="text-green-400 text-sm font-medium mb-2">
                        ✓ Ricerca completata
                    </div>
                    <div className="text-xs text-green-300 space-y-1">
                        <div>Totale: {bulkFetchStatus.summary.total}</div>
                        <div>Trovati: {bulkFetchStatus.summary.success}</div>
                        <div>Falliti: {bulkFetchStatus.summary.failed}</div>
                        <div>Già mappati: {bulkFetchStatus.summary.skipped}</div>
                    </div>
                </div>
            )}

            {!config?.configured || editing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            API Key Factorial
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Bearer token da Factorial"
                            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 focus:border-accent-purple focus:outline-none"
                        />
                        <p className="text-xs text-dark-500 mt-1">
                            Ottieni da: Configuration → API in Factorial
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={loading || !apiKey}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Salvataggio...' : 'Salva'}
                        </button>
                        {editing && (
                            <button
                                onClick={() => {
                                    setEditing(false)
                                    setApiKey('')
                                    setError(null)
                                }}
                                className="px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Annulla
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-dark-300">
                    <p className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span>Configurazione attiva</span>
                    </p>
                    <p className="text-sm text-dark-500 mt-1">
                        API Key: {config.api_key_preview}
                    </p>
                </div>
            )}
        </div>
    )
}
