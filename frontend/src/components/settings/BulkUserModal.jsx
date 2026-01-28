import { useState, useRef } from 'react'
import { createUsersBulk } from '../../api/client'

const UploadIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
)

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
)

const XIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
)

export default function BulkUserModal({ isOpen, onClose, onSuccess, teams }) {
    const [activeTab, setActiveTab] = useState('manual') // 'manual' or 'file'
    const [emailText, setEmailText] = useState('')
    const [teamId, setTeamId] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef(null)

    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    // Extract emails from text (supports various formats)
    const extractEmails = (text) => {
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        const matches = text.match(emailPattern) || []
        return [...new Set(matches.map(e => e.toLowerCase()))]
    }

    // Get parsed emails from current input
    const parsedEmails = extractEmails(emailText)
    const validEmails = parsedEmails.filter(e => emailRegex.test(e))
    const invalidEmails = parsedEmails.filter(e => !emailRegex.test(e))

    const handleFileSelect = (file) => {
        if (!file) return

        const validTypes = ['text/plain', 'text/markdown', 'text/x-markdown']
        const validExtensions = ['.txt', '.md']

        const isValidType = validTypes.includes(file.type) ||
            validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

        if (!isValidType) {
            alert('Formato file non supportato. Usa file .txt o .md')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            setEmailText(e.target.result)
            setActiveTab('manual') // Switch to manual to show parsed emails
        }
        reader.readAsText(file)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setDragOver(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setDragOver(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        handleFileSelect(file)
    }

    const handleFileInputChange = (e) => {
        const file = e.target.files[0]
        handleFileSelect(file)
    }

    const handleSubmit = async () => {
        if (validEmails.length === 0) return

        try {
            setLoading(true)
            const result = await createUsersBulk(validEmails, teamId ? parseInt(teamId) : null)
            setResults(result)

            if (result.created > 0 && onSuccess) {
                onSuccess()
            }
        } catch (err) {
            alert('Errore durante l\'importazione: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setEmailText('')
        setTeamId('')
        setResults(null)
        setActiveTab('manual')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl w-full max-w-xl mx-4 border border-dark-700 animate-fade-in max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
                    <h2 className="text-xl font-bold text-dark-100">
                        Importa Utenti in Bulk
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {!results ? (
                        <>
                            {/* Tabs */}
                            <div className="flex gap-2 p-1 bg-dark-700 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('manual')}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        activeTab === 'manual'
                                            ? 'bg-dark-600 text-dark-100'
                                            : 'text-dark-400 hover:text-dark-200'
                                    }`}
                                >
                                    Inserisci Email
                                </button>
                                <button
                                    onClick={() => setActiveTab('file')}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        activeTab === 'file'
                                            ? 'bg-dark-600 text-dark-100'
                                            : 'text-dark-400 hover:text-dark-200'
                                    }`}
                                >
                                    Carica File
                                </button>
                            </div>

                            {/* Manual Input Tab */}
                            {activeTab === 'manual' && (
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">
                                        Lista Email (una per riga)
                                    </label>
                                    <textarea
                                        value={emailText}
                                        onChange={(e) => setEmailText(e.target.value)}
                                        placeholder={"mario.rossi@company.com\ngiulia.bianchi@company.com\nluca.verdi@company.com"}
                                        className="w-full h-48 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 font-mono text-sm resize-none"
                                    />
                                    {emailText && (
                                        <div className="mt-2 flex items-center gap-4 text-sm">
                                            {validEmails.length > 0 && (
                                                <span className="flex items-center gap-1 text-accent-green">
                                                    <CheckIcon />
                                                    {validEmails.length} email valide
                                                </span>
                                            )}
                                            {invalidEmails.length > 0 && (
                                                <span className="flex items-center gap-1 text-accent-orange">
                                                    <XIcon />
                                                    {invalidEmails.length} non valide
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* File Upload Tab */}
                            {activeTab === 'file' && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                        dragOver
                                            ? 'border-accent-blue bg-accent-blue/10'
                                            : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".txt,.md,text/plain,text/markdown"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-dark-400">
                                            <UploadIcon />
                                        </div>
                                        <div>
                                            <p className="text-dark-200 font-medium">
                                                Trascina qui un file
                                            </p>
                                            <p className="text-dark-400 text-sm mt-1">
                                                oppure clicca per selezionare
                                            </p>
                                        </div>
                                        <p className="text-dark-500 text-xs">
                                            Formati supportati: .txt, .md
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Team Selection */}
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    Team (opzionale)
                                </label>
                                <select
                                    value={teamId}
                                    onChange={(e) => setTeamId(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50"
                                >
                                    <option value="">Nessun team</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-dark-500 mt-2">
                                    Il team verrà assegnato a tutti gli utenti importati
                                </p>
                            </div>
                        </>
                    ) : (
                        /* Results View */
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-dark-100">
                                        {results.total}
                                    </div>
                                    <div className="text-xs text-dark-400 mt-1">Totali</div>
                                </div>
                                <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-accent-green">
                                        {results.created}
                                    </div>
                                    <div className="text-xs text-accent-green/80 mt-1">Creati</div>
                                </div>
                                <div className={`rounded-lg p-4 text-center ${
                                    results.failed > 0
                                        ? 'bg-accent-orange/10 border border-accent-orange/30'
                                        : 'bg-dark-700/50'
                                }`}>
                                    <div className={`text-2xl font-bold ${
                                        results.failed > 0 ? 'text-accent-orange' : 'text-dark-400'
                                    }`}>
                                        {results.failed}
                                    </div>
                                    <div className={`text-xs mt-1 ${
                                        results.failed > 0 ? 'text-accent-orange/80' : 'text-dark-400'
                                    }`}>Falliti</div>
                                </div>
                            </div>

                            {/* Details */}
                            {results.results.length > 0 && (
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                    {results.results.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                                                item.success
                                                    ? 'bg-accent-green/5 text-dark-200'
                                                    : 'bg-accent-orange/5 text-dark-300'
                                            }`}
                                        >
                                            <span className="font-mono truncate flex-1">
                                                {item.email}
                                            </span>
                                            {item.success ? (
                                                <span className="flex items-center gap-1 text-accent-green ml-2">
                                                    <CheckIcon />
                                                </span>
                                            ) : (
                                                <span className="text-accent-orange text-xs ml-2 truncate max-w-[150px]" title={item.error}>
                                                    {item.error}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-700 sticky bottom-0 bg-dark-800">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
                    >
                        {results ? 'Chiudi' : 'Annulla'}
                    </button>
                    {!results && (
                        <button
                            onClick={handleSubmit}
                            disabled={validEmails.length === 0 || loading}
                            className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Importazione...
                                </span>
                            ) : (
                                `Importa (${validEmails.length})`
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
