import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { DataTable, Column, KpiBar, Badge, Modal, Button, Input, Select } from '../components/common'
import {
  getBillingClients, createBillingClient, updateBillingClient, deleteBillingClient,
  getBillingProjects, createBillingProject, updateBillingProject, deleteBillingProject,
  addBillingProjectMapping, removeBillingProjectMapping,
  getBillingRates, createBillingRate, deleteBillingRate,
  getBillingPreview, createInvoice, getInvoices, getInvoice,
  issueInvoice, voidInvoice, deleteInvoice, exportInvoiceExcel,
  getJiraInstances
} from '../api/client'
import DatePicker from 'react-datepicker'
import { Download, FileText, Users, DollarSign, TrendingUp } from 'lucide-react'

interface Client {
  id: number
  name: string
  billing_currency: string
  default_hourly_rate?: number
  jira_instance_id?: number
}

interface Project {
  id: number
  name: string
  client_id: number
  client_name: string
  default_hourly_rate?: number
  mappings?: Array<{ id: number; jira_instance: string; jira_project_key: string }>
}

interface Invoice {
  id: number
  client_name: string
  billing_project_name?: string
  period_start: string
  period_end: string
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID'
  total_amount: number
  subtotal_amount: number
  taxes_amount: number
  currency: string
  created_at: string
  issued_at?: string
  line_items?: Array<{
    id: number
    description: string
    quantity_hours: number
    hourly_rate: number
    amount: number
  }>
  group_by: string
  notes?: string
}

export default function NewBilling({ dateRange }: { dateRange: { startDate: Date; endDate: Date } }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'clients' | 'projects' | 'invoices' | 'rates'>('clients')
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [jiraInstances, setJiraInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Slide-in panel for client detail
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Load data
  const loadClients = useCallback(async () => {
    try {
      const data = await getBillingClients()
      setClients(data)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const data = await getBillingProjects()
      setProjects(data)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    try {
      const data = await getInvoices()
      setInvoices(data.invoices || [])
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const loadJiraInstances = useCallback(async () => {
    try {
      const data = await getJiraInstances()
      setJiraInstances(data.instances || [])
    } catch (e: any) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadClients(), loadProjects(), loadInvoices(), loadJiraInstances()])
      .finally(() => setLoading(false))
  }, [loadClients, loadProjects, loadInvoices, loadJiraInstances])

  // Calculate KPIs
  const totalRevenue = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  const outstanding = invoices
    .filter(inv => inv.status === 'ISSUED')
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  const overdue = invoices
    .filter(inv => inv.status === 'ISSUED' && new Date(inv.period_end) < new Date())
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  const avgRate = clients.reduce((sum, c) => sum + (c.default_hourly_rate || 0), 0) / (clients.length || 1)

  const kpiItems = [
    { label: 'Revenue (Month)', value: `€${totalRevenue.toFixed(0)}`, trend: 12, trendDirection: 'up' as const },
    { label: 'Outstanding', value: `€${outstanding.toFixed(0)}` },
    { label: 'Overdue', value: `€${overdue.toFixed(0)}` },
    { label: 'Avg Rate', value: `€${avgRate.toFixed(0)}/h` },
  ]

  // Clients columns
  const clientsColumns: Column[] = [
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'code', label: 'Code', type: 'text', width: '100px' },
    {
      key: 'default_hourly_rate',
      label: 'Default Rate',
      type: 'currency',
      width: '120px',
      render: (value: number) => (
        <span className="font-mono text-sm">{value ? `€${value}/h` : '—'}</span>
      ),
    },
    {
      key: 'projects_count',
      label: 'Projects',
      type: 'number',
      width: '100px',
      render: (_: any, row: Client) => {
        const count = projects.filter(p => p.client_id === row.id).length
        return <span className="text-secondary text-sm">{count}</span>
      },
    },
    {
      key: 'total_billed',
      label: 'Total Billed',
      type: 'currency',
      width: '140px',
      render: (_: any, row: Client) => {
        const total = invoices
          .filter(inv => inv.client_name === row.name && inv.status === 'PAID')
          .reduce((sum, inv) => sum + inv.total_amount, 0)
        return <span className="font-mono text-sm">€{total.toFixed(2)}</span>
      },
    },
  ]

  // Projects columns
  const projectsColumns: Column[] = [
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'code', label: 'Code', type: 'text', width: '100px' },
    { key: 'client_name', label: 'Client', type: 'text', width: '150px' },
    {
      key: 'default_hourly_rate',
      label: 'Rate',
      type: 'currency',
      width: '120px',
      render: (value: number) => (
        <span className="font-mono text-sm">{value ? `€${value}/h` : '—'}</span>
      ),
    },
    {
      key: 'worklogs_count',
      label: 'Worklogs',
      type: 'number',
      width: '100px',
      render: () => <span className="text-secondary text-sm">—</span>,
    },
  ]

  // Invoices columns
  const invoicesColumns: Column[] = [
    {
      key: 'id',
      label: 'Invoice #',
      type: 'link',
      width: '120px',
      render: (value: number) => (
        <span className="font-mono text-xs text-accent">INV-{String(value).padStart(4, '0')}</span>
      ),
    },
    { key: 'client_name', label: 'Client', type: 'text', width: '150px' },
    {
      key: 'period',
      label: 'Period',
      type: 'text',
      width: '200px',
      render: (_: any, row: Invoice) => (
        <span className="text-sm text-secondary">
          {format(new Date(row.period_start), 'dd/MM/yy', { locale: it })} -{' '}
          {format(new Date(row.period_end), 'dd/MM/yy', { locale: it })}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Total',
      type: 'currency',
      width: '120px',
      sortable: true,
      render: (value: number, row: Invoice) => (
        <span className="font-mono text-sm font-medium">€{value.toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      width: '100px',
      render: (value: string) => {
        const variantMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
          DRAFT: 'warning',
          ISSUED: 'info',
          PAID: 'success',
          VOID: 'error',
        }
        return <Badge variant={variantMap[value] || 'default'}>{value}</Badge>
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      type: 'date',
      width: '100px',
      render: (value: string) => (
        <span className="text-sm text-tertiary">
          {format(new Date(value), 'dd MMM', { locale: it })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-[1920px]">
      {/* KPI Bar */}
      <KpiBar items={kpiItems} />

      {/* Tab Navigation */}
      <div className="flat-card">
        <div className="border-b border-solid">
          <div className="flex gap-6 px-4">
            {[
              { id: 'clients', label: 'Clients', icon: <Users size={14} /> },
              { id: 'projects', label: 'Projects', icon: <FileText size={14} /> },
              { id: 'invoices', label: 'Invoices', icon: <DollarSign size={14} /> },
              { id: 'rates', label: 'Rates', icon: <TrendingUp size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <DataTable
              columns={clientsColumns}
              data={clients}
              loading={loading}
              sortable
              toolbar={{
                title: 'Clients',
                actions: (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingClient(null)
                      setShowClientModal(true)
                    }}
                  >
                    + New Client
                  </Button>
                ),
              }}
              onRowClick={(row) => setSelectedClient(row as Client)}
            />
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <DataTable
              columns={projectsColumns}
              data={projects}
              loading={loading}
              sortable
              toolbar={{
                title: 'Projects',
                actions: (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingProject(null)
                      setShowProjectModal(true)
                    }}
                    disabled={clients.length === 0}
                  >
                    + New Project
                  </Button>
                ),
              }}
            />
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <DataTable
              columns={invoicesColumns}
              data={invoices}
              loading={loading}
              sortable
              toolbar={{
                title: 'Invoices',
                actions: (
                  <Button variant="primary" size="sm" onClick={() => setShowInvoiceModal(true)}>
                    + New Invoice
                  </Button>
                ),
              }}
              onRowClick={async (row) => {
                const detail = await getInvoice(row.id)
                setSelectedInvoice(detail)
              }}
            />
          )}

          {/* Rates Tab */}
          {activeTab === 'rates' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-primary mb-2">Rate Cascade (6 Levels)</h3>
                <p className="text-sm text-secondary mb-6">
                  First match wins. Rates are checked in this order:
                </p>
              </div>

              {/* Cascade levels */}
              <div className="space-y-4">
                {[
                  { level: 1, name: 'Package Rate', desc: 'Highest priority - per package configuration' },
                  { level: 2, name: 'Issue Rate', desc: 'Specific issue overrides' },
                  { level: 3, name: 'Epic Rate', desc: 'Epic-level rates' },
                  { level: 4, name: 'Project Rate', desc: 'Project default rates' },
                  { level: 5, name: 'Client Rate', desc: 'Client default rates' },
                  { level: 6, name: 'Company Default', desc: 'Fallback rate' },
                ].map((item) => (
                  <div key={item.level} className="flex items-start gap-4 p-4 bg-surface-secondary rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-inverse text-sm font-bold">
                      {item.level}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-primary">{item.name}</h4>
                      <p className="text-xs text-tertiary mt-0.5">{item.desc}</p>
                    </div>
                    <span className="text-xs text-secondary">—</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-surface-secondary rounded-lg border border-solid">
                <p className="text-sm text-secondary">
                  <strong className="text-primary">Note:</strong> Configure rates in Projects tab (level 4) or
                  Client settings (level 5). Other levels are managed programmatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Detail Slide-in */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedClient(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-[400px] bg-surface border-l border-solid shadow-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">{selectedClient.name}</h3>
                  <p className="text-sm text-secondary mt-1">Client Details</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingClient(selectedClient)
                      setShowClientModal(true)
                      setSelectedClient(null)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Delete this client?')) {
                        await deleteBillingClient(selectedClient.id)
                        loadClients()
                        setSelectedClient(null)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-tertiary">Currency</span>
                  <span className="text-primary font-medium">{selectedClient.billing_currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Default Rate</span>
                  <span className="text-primary font-mono">
                    {selectedClient.default_hourly_rate ? `€${selectedClient.default_hourly_rate}/h` : '—'}
                  </span>
                </div>
              </div>

              {/* Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-primary">Projects</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingProject(null)
                      setShowProjectModal(true)
                      setSelectedClient(null)
                    }}
                  >
                    + New Project
                  </Button>
                </div>
                <div className="space-y-2">
                  {projects
                    .filter((p) => p.client_id === selectedClient.id)
                    .map((project) => (
                      <div key={project.id} className="p-3 bg-surface-secondary rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-primary">{project.name}</p>
                            {project.default_hourly_rate && (
                              <p className="text-xs text-tertiary mt-1">€{project.default_hourly_rate}/h</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {projects.filter((p) => p.client_id === selectedClient.id).length === 0 && (
                    <p className="text-sm text-tertiary">No projects yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ClientModal
        isOpen={showClientModal}
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

      <ProjectModal
        isOpen={showProjectModal}
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

      <InvoiceModal
        isOpen={showInvoiceModal}
        clients={clients}
        projects={projects}
        onClose={() => setShowInvoiceModal(false)}
        onSave={async (data) => {
          await createInvoice(data)
          setShowInvoiceModal(false)
          loadInvoices()
        }}
      />

      <InvoiceDetailModal
        isOpen={!!selectedInvoice}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  )
}

// ============ MODAL COMPONENTS ============

interface ClientModalProps {
  isOpen: boolean
  client: Client | null
  jiraInstances: any[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function ClientModal({ isOpen, client, jiraInstances, onClose, onSave }: ClientModalProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [rate, setRate] = useState('')
  const [jiraInstanceId, setJiraInstanceId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (client) {
      setName(client.name)
      setCurrency(client.billing_currency)
      setRate(client.default_hourly_rate?.toString() || '')
      setJiraInstanceId(client.jira_instance_id || '')
    } else {
      setName('')
      setCurrency('EUR')
      setRate('')
      setJiraInstanceId('')
    }
  }, [client])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Edit Client' : 'New Client'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              setSaving(true)
              await onSave({
                name,
                billing_currency: currency,
                default_hourly_rate: rate ? Number(rate) : null,
                jira_instance_id: jiraInstanceId || null,
              })
              setSaving(false)
            }}
            disabled={!name || saving}
            loading={saving}
          >
            {client ? 'Save' : 'Create Client'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Currency"
            options={[
              { value: 'EUR', label: 'EUR' },
              { value: 'USD', label: 'USD' },
              { value: 'GBP', label: 'GBP' },
            ]}
            value={currency}
            onChange={setCurrency}
          />
          <Input
            label="Default Rate (€/h)"
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <Select
          label="JIRA Instance (optional)"
          options={[
            { value: '', label: 'None' },
            ...jiraInstances.map((inst) => ({ value: String(inst.id), label: inst.name })),
          ]}
          value={String(jiraInstanceId)}
          onChange={(val) => setJiraInstanceId(val ? Number(val) : '')}
        />
      </div>
    </Modal>
  )
}

interface ProjectModalProps {
  isOpen: boolean
  project: Project | null
  clients: Client[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function ProjectModal({ isOpen, project, clients, onClose, onSave }: ProjectModalProps) {
  const [clientId, setClientId] = useState<number>(0)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setClientId(project.client_id)
      setName(project.name)
      setRate(project.default_hourly_rate?.toString() || '')
    } else {
      setClientId(clients[0]?.id || 0)
      setName('')
      setRate('')
    }
  }, [project, clients])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Edit Project' : 'New Project'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              setSaving(true)
              await onSave({
                client_id: clientId,
                name,
                default_hourly_rate: rate ? Number(rate) : null,
              })
              setSaving(false)
            }}
            disabled={!name || saving}
            loading={saving}
          >
            {project ? 'Save' : 'Create Project'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Client"
          options={clients.map((c) => ({ value: String(c.id), label: c.name }))}
          value={String(clientId)}
          onChange={(val) => setClientId(Number(val))}
          disabled={!!project}
        />
        <Input label="Project Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label="Hourly Rate (€/h)"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Inherit from client"
          helper="Leave empty to use client's default rate"
        />
      </div>
    </Modal>
  )
}

interface InvoiceModalProps {
  isOpen: boolean
  clients: Client[]
  projects: Project[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function InvoiceModal({ isOpen, clients, projects, onClose, onSave }: InvoiceModalProps) {
  const [clientId, setClientId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [periodStart, setPeriodStart] = useState(new Date())
  const [periodEnd, setPeriodEnd] = useState(new Date())
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setClientId('')
      setProjectId('')
      setNotes('')
      setPreview(null)
    }
  }, [isOpen])

  // Load preview when client and dates change
  useEffect(() => {
    if (clientId && periodStart && periodEnd) {
      const loadPreview = async () => {
        setPreviewLoading(true)
        try {
          const data = await getBillingPreview(
            Number(clientId),
            periodStart,
            periodEnd,
            'project',
            projectId ? Number(projectId) : null
          )
          setPreview(data)
        } catch (e) {
          console.error(e)
          setPreview(null)
        } finally {
          setPreviewLoading(false)
        }
      }
      loadPreview()
    }
  }, [clientId, projectId, periodStart, periodEnd])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Invoice"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              setSaving(true)
              await onSave({
                client_id: Number(clientId),
                billing_project_id: projectId ? Number(projectId) : null,
                period_start: periodStart,
                period_end: periodEnd,
                group_by: 'project',
                taxes_amount: 0,
                notes: notes || null,
              })
              setSaving(false)
            }}
            disabled={!clientId || !preview || saving}
            loading={saving}
          >
            Create Invoice →
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Client"
            options={[
              { value: '', label: 'Select client...' },
              ...clients.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            value={clientId}
            onChange={setClientId}
            searchable
          />
          <Select
            label="Project (optional)"
            options={[
              { value: '', label: 'All projects' },
              ...projects.filter((p) => p.client_id === Number(clientId)).map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            value={projectId}
            onChange={setProjectId}
            disabled={!clientId}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Period Start</label>
            <DatePicker
              selected={periodStart}
              onChange={(date) => date && setPeriodStart(date)}
              dateFormat="dd/MM/yyyy"
              locale={it}
              className="w-full h-input px-3 bg-surface border border-solid rounded-md text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Period End</label>
            <DatePicker
              selected={periodEnd}
              onChange={(date) => date && setPeriodEnd(date)}
              dateFormat="dd/MM/yyyy"
              locale={it}
              className="w-full h-input px-3 bg-surface border border-solid rounded-md text-primary text-sm"
            />
          </div>
        </div>

        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />

        {/* Preview Section */}
        <div className="border-t border-solid pt-4">
          {previewLoading && (
            <p className="text-sm text-secondary">Loading preview...</p>
          )}
          {preview && !previewLoading && (
            <div className="p-4 bg-surface-secondary rounded-lg">
              <p className="text-sm text-primary">
                <strong>Preview:</strong> {preview.line_items?.length || 0} worklogs ·{' '}
                {preview.billable_hours?.toFixed(1) || 0}h · Estimated total:{' '}
                <span className="font-bold">€{preview.subtotal_amount?.toFixed(2) || '0.00'}</span>
              </p>
            </div>
          )}
          {!clientId && !previewLoading && (
            <p className="text-sm text-tertiary">Select client and period to see preview</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

interface InvoiceDetailModalProps {
  isOpen: boolean
  invoice: Invoice | null
  onClose: () => void
}

function InvoiceDetailModal({ isOpen, invoice, onClose }: InvoiceDetailModalProps) {
  if (!invoice) return null

  const statusVariantMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    DRAFT: 'warning',
    ISSUED: 'info',
    PAID: 'success',
    VOID: 'error',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`INV-${String(invoice.id).padStart(4, '0')}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportInvoiceExcel(invoice.id)}>
            Download PDF
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Header with status */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-secondary">{invoice.client_name}</p>
            {invoice.billing_project_name && (
              <p className="text-xs text-tertiary mt-0.5">{invoice.billing_project_name}</p>
            )}
          </div>
          <Badge variant={statusVariantMap[invoice.status] || 'default'}>{invoice.status}</Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-tertiary">Period:</span>
            <span className="text-primary ml-2">
              {format(new Date(invoice.period_start), 'dd/MM/yyyy')} → {format(new Date(invoice.period_end), 'dd/MM/yyyy')}
            </span>
          </div>
          <div>
            <span className="text-tertiary">Issue Date:</span>
            <span className="text-primary ml-2">
              {invoice.issued_at ? format(new Date(invoice.issued_at), 'dd/MM/yyyy') : '—'}
            </span>
          </div>
          <div>
            <span className="text-tertiary">Currency:</span>
            <span className="text-primary ml-2">{invoice.currency}</span>
          </div>
          <div>
            <span className="text-tertiary">Group By:</span>
            <span className="text-primary ml-2">{invoice.group_by}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="border border-solid rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr className="text-tertiary text-xs uppercase">
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3">Hours</th>
                <th className="text-right py-2 px-3">Rate</th>
                <th className="text-right py-2 px-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.line_items || []).map((item, idx) => (
                <tr key={item.id || idx} className="border-t border-solid">
                  <td className="py-2 px-3 text-tertiary">{idx + 1}</td>
                  <td className="py-2 px-3 text-primary">{item.description}</td>
                  <td className="py-2 px-3 text-right text-secondary font-mono">{item.quantity_hours}</td>
                  <td className="py-2 px-3 text-right text-secondary font-mono">€{item.hourly_rate}</td>
                  <td className="py-2 px-3 text-right text-primary font-mono font-medium">
                    €{item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-right text-sm border-t border-solid pt-4">
          <div className="flex justify-end gap-8">
            <span className="text-secondary">Subtotal:</span>
            <span className="text-primary font-medium font-mono">€{invoice.subtotal_amount.toFixed(2)}</span>
          </div>
          {invoice.taxes_amount > 0 && (
            <div className="flex justify-end gap-8">
              <span className="text-tertiary">Tax:</span>
              <span className="text-secondary font-mono">€{invoice.taxes_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-end gap-8 pt-2 border-t border-solid mt-2">
            <span className="text-primary font-bold text-base">Total:</span>
            <span className="text-primary font-bold text-xl font-mono">
              €{invoice.total_amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="pt-4 border-t border-solid">
            <p className="text-xs text-tertiary mb-1">Notes:</p>
            <p className="text-sm text-secondary">{invoice.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
