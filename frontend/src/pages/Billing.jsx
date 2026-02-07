import { useState, useEffect, useCallback } from 'react'
import { it } from 'date-fns/locale'
import DatePicker from 'react-datepicker'
import {
    getBillingClients, createBillingClient, updateBillingClient, deleteBillingClient,
    getBillingProjects, createBillingProject, updateBillingProject, deleteBillingProject,
    addBillingProjectMapping, removeBillingProjectMapping,
    getBillingRates, createBillingRate, deleteBillingRate,
    getBillingPreview, createInvoice, getInvoices, getInvoice,
    issueInvoice, voidInvoice, deleteInvoice, exportInvoiceExcel,
    getJiraInstances
} from '../api/client'

const STATUS_COLORS = {
    DRAFT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ISSUED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
    VOID: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_LABELS = {
    DRAFT: 'Bozza',
    ISSUED: 'Emessa',
    PAID: 'Pagata',
    VOID: 'Annullata',
}

export default function Billing({ dateRange }) {
    const [activeTab, setActiveTab] = useState('clients')
    const [clients, setClients] = useState([])
    const [projects, setProjects] = useState([])
    const [invoices, setInvoices] = useState([])
    const [jiraInstances, setJiraInstances] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Modal states
    const [showClientModal, setShowClientModal] = useState(false)
    const [editingClient, setEditingClient] = useState(null)
    const [showProjectModal, setShowProjectModal] = useState(false)
    const [editingProject, setEditingProject] = useState(null)
    const [showMappingModal, setShowMappingModal] = useState(false)
    const [mappingProjectId, setMappingProjectId] = useState(null)
    const [showRateModal, setShowRateModal] = useState(false)
    const [rateProjectId, setRateProjectId] = useState(null)
    const [showInvoiceDetail, setShowInvoiceDetail] = useState(null)

    // Invoice builder state
    const [selectedClientId, setSelectedClientId] = useState('')
    const [selectedProjectId, setSelectedProjectId] = useState('')
    const [groupBy, setGroupBy] = useState('project')
    const [preview, setPreview] = useState(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [taxesAmount, setTaxesAmount] = useState(0)
    const [invoiceNotes, setInvoiceNotes] = useState('')
    const [invoicePeriod, setInvoicePeriod] = useState({ start: dateRange?.startDate || new Date(), end: dateRange?.endDate || new Date() })

    // Rates display
    const [projectRates, setProjectRates] = useState({})
    const [expandedProject, setExpandedProject] = useState(null)

    const loadClients = useCallback(async () => {
        try {
            const data = await getBillingClients()
            setClients(data)
        } catch (e) { setError(e.message) }
    }, [])

    const loadProjects = useCallback(async () => {
        try {
            const data = await getBillingProjects()
            setProjects(data)
        } catch (e) { setError(e.message) }
    }, [])

    const loadInvoices = useCallback(async () => {
        try {
            const data = await getInvoices()
            setInvoices(data.invoices || [])
        } catch (e) { setError(e.message) }
    }, [])

    const loadJiraInstances = useCallback(async () => {
        try {
            const data = await getJiraInstances()
            setJiraInstances(data)
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => {
        setLoading(true)
        Promise.all([loadClients(), loadProjects(), loadInvoices(), loadJiraInstances()])
            .finally(() => setLoading(false))
    }, [loadClients, loadProjects, loadInvoices, loadJiraInstances])

    // Load rates when a project is expanded
    const toggleProjectRates = async (projectId) => {
        if (expandedProject === projectId) {
            setExpandedProject(null)
            return
        }
        setExpandedProject(projectId)
        if (!projectRates[projectId]) {
            try {
                const rates = await getBillingRates(projectId)
                setProjectRates(prev => ({ ...prev, [projectId]: rates }))
            } catch (e) { console.error(e) }
        }
    }

    const tabs = [
        { id: 'clients', label: 'Clienti', count: clients.length },
        { id: 'projects', label: 'Progetti', count: projects.length },
        { id: 'invoice-builder', label: 'Nuova Fattura', count: null },
        { id: 'invoices', label: 'Fatture', count: invoices.length },
    ]

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-dark-100">Fatturazione</h1>
                <p className="text-dark-400 mt-1">Gestisci clienti, progetti, tariffe e fatture</p>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    {error}
                    <button onClick={() => setError(null)} className="ml-4 underline">Chiudi</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-dark-800 rounded-xl p-1 border border-dark-600">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                        }`}
                    >
                        {tab.label}
                        {tab.count !== null && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-dark-600'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading && <div className="text-center py-12 text-dark-400">Caricamento...</div>}

            {/* ============ CLIENTS TAB ============ */}
            {!loading && activeTab === 'clients' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-dark-200">Clienti</h2>
                        <button onClick={() => { setEditingClient(null); setShowClientModal(true) }} className="btn-primary text-sm">
                            + Nuovo Cliente
                        </button>
                    </div>

                    {clients.length === 0 ? (
                        <div className="glass-card p-12 text-center text-dark-400">
                            Nessun cliente configurato. Crea il primo cliente per iniziare.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {clients.map(client => (
                                <div key={client.id} className="glass-card p-5 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-dark-100">{client.name}</h3>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingClient(client); setShowClientModal(true) }} className="p-1.5 text-dark-400 hover:text-dark-200 rounded-lg hover:bg-dark-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={async () => { if (confirm('Eliminare questo cliente?')) { await deleteBillingClient(client.id); loadClients() } }} className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between text-dark-400">
                                            <span>Valuta</span>
                                            <span className="text-dark-200">{client.billing_currency}</span>
                                        </div>
                                        <div className="flex justify-between text-dark-400">
                                            <span>Tariffa default</span>
                                            <span className="text-dark-200">{client.default_hourly_rate ? `${client.default_hourly_rate} €/h` : '—'}</span>
                                        </div>
                                        {client.jira_instance_id && (
                                            <div className="flex justify-between text-dark-400">
                                                <span>Istanza JIRA</span>
                                                <span className="text-dark-200">{jiraInstances?.instances?.find(i => i.id === client.jira_instance_id)?.name || '—'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ PROJECTS TAB ============ */}
            {!loading && activeTab === 'projects' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-dark-200">Progetti di Fatturazione</h2>
                        <button onClick={() => { setEditingProject(null); setShowProjectModal(true) }} className="btn-primary text-sm" disabled={clients.length === 0}>
                            + Nuovo Progetto
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <div className="glass-card p-12 text-center text-dark-400">
                            {clients.length === 0
                                ? 'Crea prima un cliente, poi potrai aggiungere progetti.'
                                : 'Nessun progetto di fatturazione. Crea il primo progetto.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {projects.map(project => (
                                <div key={project.id} className="glass-card overflow-hidden">
                                    <div className="p-5 flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-dark-100">{project.name}</h3>
                                            <p className="text-sm text-dark-400 mt-1">
                                                Cliente: <span className="text-dark-300">{project.client_name}</span>
                                                {project.default_hourly_rate && <> · Tariffa: <span className="text-dark-300">{project.default_hourly_rate} €/h</span></>}
                                            </p>
                                            {/* Mappings */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {(project.mappings || []).map(m => (
                                                    <span key={m.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                                                        {m.jira_instance}:{m.jira_project_key}
                                                        <button onClick={async () => { await removeBillingProjectMapping(project.id, m.id); loadProjects() }} className="hover:text-red-400 ml-1">&times;</button>
                                                    </span>
                                                ))}
                                                <button
                                                    onClick={() => { setMappingProjectId(project.id); setShowMappingModal(true) }}
                                                    className="text-xs px-2 py-1 rounded-full border border-dashed border-dark-500 text-dark-400 hover:text-dark-200 hover:border-dark-400"
                                                >
                                                    + Mappa JIRA
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => toggleProjectRates(project.id)} className={`p-1.5 rounded-lg hover:bg-dark-700 ${expandedProject === project.id ? 'text-accent-purple' : 'text-dark-400 hover:text-dark-200'}`} title="Tariffe">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </button>
                                            <button onClick={() => { setEditingProject(project); setShowProjectModal(true) }} className="p-1.5 text-dark-400 hover:text-dark-200 rounded-lg hover:bg-dark-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={async () => { if (confirm('Eliminare questo progetto?')) { await deleteBillingProject(project.id); loadProjects() } }} className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rates section (expandable) */}
                                    {expandedProject === project.id && (
                                        <div className="border-t border-dark-700 p-5 bg-dark-800/30">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-medium text-dark-300">Tariffe Override</h4>
                                                <button onClick={() => { setRateProjectId(project.id); setShowRateModal(true) }} className="text-xs text-accent-purple hover:underline">+ Aggiungi Tariffa</button>
                                            </div>
                                            {(projectRates[project.id] || []).length === 0 ? (
                                                <p className="text-xs text-dark-500">Nessuna tariffa override. Verrà usata la tariffa default del progetto o del cliente.</p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-dark-500 text-xs">
                                                            <th className="text-left py-1">Utente</th>
                                                            <th className="text-left py-1">Tipo Issue</th>
                                                            <th className="text-right py-1">Tariffa</th>
                                                            <th className="text-left py-1">Validità</th>
                                                            <th className="py-1"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(projectRates[project.id] || []).map(rate => (
                                                            <tr key={rate.id} className="border-t border-dark-700/50">
                                                                <td className="py-1.5 text-dark-300">{rate.user_email || '—'}</td>
                                                                <td className="py-1.5 text-dark-300">{rate.issue_type || '—'}</td>
                                                                <td className="py-1.5 text-right text-dark-200">{rate.hourly_rate} €/h</td>
                                                                <td className="py-1.5 text-dark-400 text-xs">{rate.valid_from || '∞'} → {rate.valid_to || '∞'}</td>
                                                                <td className="py-1.5 text-right">
                                                                    <button onClick={async () => { await deleteBillingRate(rate.id); const rates = await getBillingRates(project.id); setProjectRates(prev => ({ ...prev, [project.id]: rates })) }} className="text-red-400 hover:text-red-300 text-xs">Elimina</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ INVOICE BUILDER TAB ============ */}
            {!loading && activeTab === 'invoice-builder' && (
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-dark-200">Nuova Fattura</h2>

                    <div className="glass-card p-6 space-y-5">
                        {/* Client selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">Cliente</label>
                                <select value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setSelectedProjectId(''); setPreview(null) }}
                                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm">
                                    <option value="">Seleziona cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">Progetto (opzionale)</label>
                                <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setPreview(null) }}
                                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" disabled={!selectedClientId}>
                                    <option value="">Tutti i progetti</option>
                                    {projects.filter(p => p.client_id === Number(selectedClientId)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Period & Group By */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">Da</label>
                                <DatePicker
                                    selected={invoicePeriod.start}
                                    onChange={d => { setInvoicePeriod(prev => ({ ...prev, start: d })); setPreview(null) }}
                                    dateFormat="dd/MM/yyyy"
                                    locale={it}
                                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">A</label>
                                <DatePicker
                                    selected={invoicePeriod.end}
                                    onChange={d => { setInvoicePeriod(prev => ({ ...prev, end: d })); setPreview(null) }}
                                    dateFormat="dd/MM/yyyy"
                                    locale={it}
                                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">Raggruppa per</label>
                                <select value={groupBy} onChange={e => { setGroupBy(e.target.value); setPreview(null) }}
                                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm">
                                    <option value="project">Progetto</option>
                                    <option value="user">Utente</option>
                                    <option value="issue">Issue</option>
                                </select>
                            </div>
                        </div>

                        {/* Preview button */}
                        <button
                            onClick={async () => {
                                if (!selectedClientId) { setError('Seleziona un cliente'); return }
                                setPreviewLoading(true)
                                try {
                                    const data = await getBillingPreview(
                                        Number(selectedClientId),
                                        invoicePeriod.start,
                                        invoicePeriod.end,
                                        groupBy,
                                        selectedProjectId ? Number(selectedProjectId) : null
                                    )
                                    setPreview(data)
                                } catch (e) { setError(e.message) }
                                finally { setPreviewLoading(false) }
                            }}
                            className="btn-primary"
                            disabled={!selectedClientId || previewLoading}
                        >
                            {previewLoading ? 'Calcolo...' : 'Calcola Preview'}
                        </button>
                    </div>

                    {/* Preview Results */}
                    {preview && (
                        <div className="glass-card p-6 space-y-5">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-dark-100">Preview Fattura</h3>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-dark-400">Ore billable: <span className="text-accent-green font-medium">{preview.billable_hours}h</span></span>
                                    <span className="text-dark-400">Non billable: <span className="text-dark-300">{preview.non_billable_hours}h</span></span>
                                </div>
                            </div>

                            {/* Line items table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-dark-500 text-xs border-b border-dark-700">
                                            <th className="text-left py-2 px-3">Descrizione</th>
                                            <th className="text-right py-2 px-3">Ore</th>
                                            <th className="text-right py-2 px-3">Tariffa</th>
                                            <th className="text-right py-2 px-3">Importo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.line_items.map((li, idx) => (
                                            <tr key={idx} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                                                <td className="py-2.5 px-3 text-dark-200">{li.description}</td>
                                                <td className="py-2.5 px-3 text-right text-dark-300">{li.quantity_hours}</td>
                                                <td className="py-2.5 px-3 text-right text-dark-300">{li.hourly_rate} €</td>
                                                <td className="py-2.5 px-3 text-right text-dark-100 font-medium">{li.amount.toFixed(2)} €</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-dark-600">
                                            <td colSpan={3} className="py-3 px-3 text-right font-semibold text-dark-200">Subtotale</td>
                                            <td className="py-3 px-3 text-right font-bold text-dark-100">{preview.subtotal_amount.toFixed(2)} €</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Taxes + Notes + Create */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dark-700">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-1">IVA / Tasse</label>
                                    <input type="number" value={taxesAmount} onChange={e => setTaxesAmount(Number(e.target.value))}
                                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" step="0.01" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-1">Note</label>
                                    <input type="text" value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)}
                                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" placeholder="Note opzionali..." />
                                </div>
                                <div className="flex items-end">
                                    <div className="text-right w-full">
                                        <p className="text-sm text-dark-400 mb-1">Totale: <span className="text-lg font-bold text-dark-100">{(preview.subtotal_amount + taxesAmount).toFixed(2)} €</span></p>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await createInvoice({
                                                        client_id: Number(selectedClientId),
                                                        billing_project_id: selectedProjectId ? Number(selectedProjectId) : null,
                                                        period_start: invoicePeriod.start,
                                                        period_end: invoicePeriod.end,
                                                        group_by: groupBy,
                                                        taxes_amount: taxesAmount,
                                                        notes: invoiceNotes || null
                                                    })
                                                    setPreview(null)
                                                    setActiveTab('invoices')
                                                    loadInvoices()
                                                } catch (e) { setError(e.message) }
                                            }}
                                            className="btn-primary mt-2"
                                        >
                                            Crea Fattura (Bozza)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============ INVOICES TAB ============ */}
            {!loading && activeTab === 'invoices' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-dark-200">Fatture</h2>

                    {invoices.length === 0 ? (
                        <div className="glass-card p-12 text-center text-dark-400">
                            Nessuna fattura. Usa il tab "Nuova Fattura" per crearne una.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map(inv => (
                                <div key={inv.id} className="glass-card p-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-dark-100">Fattura #{inv.id}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status]}`}>
                                                    {STATUS_LABELS[inv.status] || inv.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-dark-400 mt-1">
                                                {inv.client_name}
                                                {inv.billing_project_name && <> · {inv.billing_project_name}</>}
                                                {' · '}{inv.period_start} → {inv.period_end}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-dark-100">{inv.total_amount.toFixed(2)} {inv.currency}</p>
                                            <p className="text-xs text-dark-500">Creata: {inv.created_at?.split('T')[0]}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-dark-700/50">
                                        <button onClick={async () => {
                                            const detail = await getInvoice(inv.id)
                                            setShowInvoiceDetail(detail)
                                        }} className="text-xs text-accent-blue hover:underline">Dettaglio</button>

                                        {inv.status === 'DRAFT' && (
                                            <>
                                                <button onClick={async () => { if (confirm('Emettere questa fattura?')) { await issueInvoice(inv.id); loadInvoices() } }} className="text-xs text-accent-green hover:underline">Emetti</button>
                                                <button onClick={async () => { if (confirm('Eliminare questa bozza?')) { await deleteInvoice(inv.id); loadInvoices() } }} className="text-xs text-red-400 hover:underline">Elimina</button>
                                            </>
                                        )}

                                        {(inv.status === 'DRAFT' || inv.status === 'ISSUED') && (
                                            <button onClick={async () => { if (confirm('Annullare questa fattura?')) { await voidInvoice(inv.id); loadInvoices() } }} className="text-xs text-yellow-400 hover:underline">Annulla</button>
                                        )}

                                        <button onClick={() => exportInvoiceExcel(inv.id)} className="text-xs text-accent-purple hover:underline">Esporta Excel</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ MODALS ============ */}

            {/* Client Modal */}
            {showClientModal && (
                <ClientModal
                    client={editingClient}
                    jiraInstances={jiraInstances}
                    onClose={() => setShowClientModal(false)}
                    onSave={async (data) => {
                        if (editingClient) {
                            await updateBillingClient(editingClient.id, data)
                        } else {
                            await createBillingClient(data)
                        }
                        setShowClientModal(false)
                        loadClients()
                    }}
                />
            )}

            {/* Project Modal */}
            {showProjectModal && (
                <ProjectModal
                    project={editingProject}
                    clients={clients}
                    onClose={() => setShowProjectModal(false)}
                    onSave={async (data) => {
                        if (editingProject) {
                            await updateBillingProject(editingProject.id, data)
                        } else {
                            await createBillingProject(data)
                        }
                        setShowProjectModal(false)
                        loadProjects()
                    }}
                />
            )}

            {/* Mapping Modal */}
            {showMappingModal && (
                <MappingModal
                    projectId={mappingProjectId}
                    jiraInstances={jiraInstances}
                    onClose={() => setShowMappingModal(false)}
                    onSave={async (data) => {
                        await addBillingProjectMapping(mappingProjectId, data)
                        setShowMappingModal(false)
                        loadProjects()
                    }}
                />
            )}

            {/* Rate Modal */}
            {showRateModal && (
                <RateModal
                    projectId={rateProjectId}
                    onClose={() => setShowRateModal(false)}
                    onSave={async (data) => {
                        await createBillingRate(data)
                        setShowRateModal(false)
                        const rates = await getBillingRates(rateProjectId)
                        setProjectRates(prev => ({ ...prev, [rateProjectId]: rates }))
                    }}
                />
            )}

            {/* Invoice Detail Modal */}
            {showInvoiceDetail && (
                <InvoiceDetailModal
                    invoice={showInvoiceDetail}
                    onClose={() => setShowInvoiceDetail(null)}
                />
            )}
        </div>
    )
}

// ============ MODAL COMPONENTS ============

function ClientModal({ client, jiraInstances, onClose, onSave }) {
    const [name, setName] = useState(client?.name || '')
    const [currency, setCurrency] = useState(client?.billing_currency || 'EUR')
    const [rate, setRate] = useState(client?.default_hourly_rate || '')
    const [jiraInstanceId, setJiraInstanceId] = useState(client?.jira_instance_id || '')
    const [saving, setSaving] = useState(false)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-dark-100 mb-4">{client ? 'Modifica Cliente' : 'Nuovo Cliente'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Nome</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-dark-300 mb-1">Valuta</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm">
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-dark-300 mb-1">Tariffa default (€/h)</label>
                            <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" step="0.01" min="0" placeholder="0.00" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Istanza JIRA (opzionale)</label>
                        <select value={jiraInstanceId} onChange={e => setJiraInstanceId(e.target.value ? Number(e.target.value) : '')} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm">
                            <option value="">Nessuna</option>
                            {jiraInstances?.instances?.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="btn-secondary text-sm">Annulla</button>
                    <button onClick={async () => { setSaving(true); await onSave({ name, billing_currency: currency, default_hourly_rate: rate ? Number(rate) : null, jira_instance_id: jiraInstanceId || null }); setSaving(false) }} className="btn-primary text-sm" disabled={!name || saving}>
                        {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ProjectModal({ project, clients, onClose, onSave }) {
    const [clientId, setClientId] = useState(project?.client_id || (clients[0]?.id || ''))
    const [name, setName] = useState(project?.name || '')
    const [rate, setRate] = useState(project?.default_hourly_rate || '')
    const [saving, setSaving] = useState(false)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-dark-100 mb-4">{project ? 'Modifica Progetto' : 'Nuovo Progetto'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Cliente</label>
                        <select value={clientId} onChange={e => setClientId(Number(e.target.value))} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" disabled={!!project}>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Nome progetto</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Tariffa oraria default (€/h)</label>
                        <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" step="0.01" min="0" placeholder="Eredita dal cliente" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="btn-secondary text-sm">Annulla</button>
                    <button onClick={async () => { setSaving(true); await onSave({ client_id: Number(clientId), name, default_hourly_rate: rate ? Number(rate) : null }); setSaving(false) }} className="btn-primary text-sm" disabled={!name || saving}>
                        {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function MappingModal({ projectId, jiraInstances, onClose, onSave }) {
    const [instance, setInstance] = useState(jiraInstances[0]?.name || '')
    const [projectKey, setProjectKey] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Mappa Progetto JIRA</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Istanza JIRA</label>
                        <select value={instance} onChange={e => setInstance(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm">
                            {jiraInstances.map(i => <option key={i.id || i.name} value={i.name}>{i.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Project Key JIRA</label>
                        <input value={projectKey} onChange={e => setProjectKey(e.target.value.toUpperCase())} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" placeholder="es. PROJ" autoFocus />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="btn-secondary text-sm">Annulla</button>
                    <button onClick={() => onSave({ jira_instance: instance, jira_project_key: projectKey })} className="btn-primary text-sm" disabled={!instance || !projectKey}>
                        Aggiungi
                    </button>
                </div>
            </div>
        </div>
    )
}

function RateModal({ projectId, onClose, onSave }) {
    const [email, setEmail] = useState('')
    const [issueType, setIssueType] = useState('')
    const [rate, setRate] = useState('')
    const [validFrom, setValidFrom] = useState('')
    const [validTo, setValidTo] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Nuova Tariffa Override</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Email utente (opzionale)</label>
                        <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" placeholder="Lascia vuoto per tutti" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Tipo issue (opzionale)</label>
                        <input value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" placeholder="es. Epic, Story, Task" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Tariffa oraria (€/h)</label>
                        <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" step="0.01" min="0" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-dark-300 mb-1">Valido da</label>
                            <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm text-dark-300 mb-1">Valido fino a</label>
                            <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 text-sm" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="btn-secondary text-sm">Annulla</button>
                    <button onClick={() => onSave({
                        billing_project_id: projectId,
                        hourly_rate: Number(rate),
                        user_email: email || null,
                        issue_type: issueType || null,
                        valid_from: validFrom || null,
                        valid_to: validTo || null
                    })} className="btn-primary text-sm" disabled={!rate}>
                        Salva
                    </button>
                </div>
            </div>
        </div>
    )
}

function InvoiceDetailModal({ invoice, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-dark-100">Fattura #{invoice.id}</h3>
                        <p className="text-sm text-dark-400">{invoice.client_name}{invoice.billing_project_name && ` · ${invoice.billing_project_name}`}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[invoice.status]}`}>
                        {STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div><span className="text-dark-500">Periodo:</span> <span className="text-dark-200 ml-2">{invoice.period_start} → {invoice.period_end}</span></div>
                    <div><span className="text-dark-500">Valuta:</span> <span className="text-dark-200 ml-2">{invoice.currency}</span></div>
                    <div><span className="text-dark-500">Raggruppamento:</span> <span className="text-dark-200 ml-2">{invoice.group_by}</span></div>
                    {invoice.issued_at && <div><span className="text-dark-500">Emessa il:</span> <span className="text-dark-200 ml-2">{invoice.issued_at?.split('T')[0]}</span></div>}
                </div>

                {/* Line items */}
                <table className="w-full text-sm mb-4">
                    <thead>
                        <tr className="text-dark-500 text-xs border-b border-dark-700">
                            <th className="text-left py-2">#</th>
                            <th className="text-left py-2">Descrizione</th>
                            <th className="text-right py-2">Ore</th>
                            <th className="text-right py-2">Tariffa</th>
                            <th className="text-right py-2">Importo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoice.line_items || []).map((li, idx) => (
                            <tr key={li.id || idx} className="border-b border-dark-700/50">
                                <td className="py-2 text-dark-500">{idx + 1}</td>
                                <td className="py-2 text-dark-200">{li.description}</td>
                                <td className="py-2 text-right text-dark-300">{li.quantity_hours}</td>
                                <td className="py-2 text-right text-dark-300">{li.hourly_rate} €</td>
                                <td className="py-2 text-right text-dark-100 font-medium">{li.amount.toFixed(2)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-dark-600 pt-4 space-y-1 text-sm text-right">
                    <div className="text-dark-400">Subtotale: <span className="text-dark-200 font-medium">{invoice.subtotal_amount.toFixed(2)} €</span></div>
                    {invoice.taxes_amount > 0 && <div className="text-dark-400">IVA/Tasse: <span className="text-dark-200">{invoice.taxes_amount.toFixed(2)} €</span></div>}
                    <div className="text-lg font-bold text-dark-100 pt-2">Totale: {invoice.total_amount.toFixed(2)} {invoice.currency}</div>
                </div>

                {invoice.notes && (
                    <div className="mt-4 pt-4 border-t border-dark-700">
                        <p className="text-xs text-dark-500">Note:</p>
                        <p className="text-sm text-dark-300">{invoice.notes}</p>
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="btn-secondary text-sm">Chiudi</button>
                </div>
            </div>
        </div>
    )
}
