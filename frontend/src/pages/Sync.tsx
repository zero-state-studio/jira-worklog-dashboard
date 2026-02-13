import { useState, useEffect, useCallback } from 'react'
import { Card, Button, Badge, DateRangePicker } from '../components/common'
import { getSyncDefaults, getSyncStatus, getSyncHistory, syncWorklogsStream } from '../api/client'
import { RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface SyncDefaults {
  default_start_date: string
  default_end_date: string
  available_instances: Array<{ name: string; url: string }>
}

interface SyncStatus {
  total_worklogs: number
  date_range_start: string | null
  date_range_end: string | null
  has_data: boolean
}

interface SyncHistoryItem {
  id: number
  started_at: string
  completed_at: string | null
  status: string
  instances: string[]
  worklogs_synced: number
  worklogs_updated: number
  worklogs_deleted: number
  error_message: string | null
}

interface ProgressEvent {
  type: string
  message?: string
  percent?: number
  instance?: string
  count?: number
  synced?: number
  updated?: number
  deleted?: number
  worklogs_synced?: number
  worklogs_updated?: number
  worklogs_deleted?: number
}

export default function Sync() {
  const [defaults, setDefaults] = useState<SyncDefaults | null>(null)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [history, setHistory] = useState<SyncHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [syncAll, setSyncAll] = useState(true)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState('')
  const [logs, setLogs] = useState<ProgressEvent[]>([])
  const [syncResult, setSyncResult] = useState<ProgressEvent | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [defaultsData, statusData, historyData] = await Promise.all([
        getSyncDefaults(),
        getSyncStatus(),
        getSyncHistory(10),
      ])

      setDefaults(defaultsData)
      setStatus(statusData)
      setHistory(historyData.history || [])

      // Set default dates
      if (defaultsData.default_start_date) {
        setStartDate(new Date(defaultsData.default_start_date))
      }
      if (defaultsData.default_end_date) {
        setEndDate(new Date(defaultsData.default_end_date))
      }

      // Select all instances by default
      if (defaultsData.available_instances?.length > 0) {
        setSelectedInstances(defaultsData.available_instances.map(i => i.name))
      }
    } catch (err) {
      console.error('Error loading sync data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInstanceToggle = (instanceName: string) => {
    if (selectedInstances.includes(instanceName)) {
      setSelectedInstances(selectedInstances.filter(i => i !== instanceName))
    } else {
      setSelectedInstances([...selectedInstances, instanceName])
    }
    setSyncAll(false)
  }

  const handleSelectAll = () => {
    if (defaults?.available_instances) {
      setSelectedInstances(defaults.available_instances.map(i => i.name))
      setSyncAll(true)
    }
  }

  const handleDeselectAll = () => {
    setSelectedInstances([])
    setSyncAll(false)
  }

  const handleSync = async () => {
    if (!startDate || !endDate) return

    setSyncing(true)
    setProgress(0)
    setCurrentMessage('Avvio sincronizzazione...')
    setLogs([])
    setSyncResult(null)

    try {
      const instancesToSync = syncAll ? null : selectedInstances

      await syncWorklogsStream(startDate, endDate, instancesToSync, (event: ProgressEvent) => {
        setLogs(prev => [...prev, event])

        if (event.percent !== undefined) {
          setProgress(event.percent)
        }

        if (event.message) {
          setCurrentMessage(event.message)
        }

        if (event.type === 'complete') {
          setSyncResult(event)
          setTimeout(() => {
            loadData() // Reload data after sync
          }, 1000)
        }

        if (event.type === 'error') {
          setSyncResult(event)
        }
      })
    } catch (err: any) {
      setCurrentMessage(`Errore: ${err.message}`)
      setSyncResult({ type: 'error', message: err.message })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <div className="h-96 bg-surface rounded animate-pulse" />
      </div>
    )
  }

  const canSync = !syncing && (syncAll || selectedInstances.length > 0) && startDate && endDate

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="text-xs text-tertiary">
        <span>Workspace</span> <span className="mx-2">/</span> <span className="text-primary">Sync</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-primary mb-1">Sincronizzazione Worklog</h1>
        <p className="text-sm text-tertiary">
          Sincronizza manualmente i worklog dalle istanze JIRA configurate
        </p>
      </div>

      {/* Data Status */}
      {status && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center">
                <Database size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  {status.total_worklogs.toLocaleString()} worklog in database
                </p>
                {status.date_range_start && status.date_range_end && (
                  <p className="text-xs text-tertiary">
                    Range: {new Date(status.date_range_start).toLocaleDateString('it-IT')} -{' '}
                    {new Date(status.date_range_end).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={status.has_data ? 'success' : 'default'}>
              {status.has_data ? 'Dati presenti' : 'Nessun dato'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Sync Form */}
      <Card>
        <h2 className="text-base font-semibold text-primary mb-4">Configura Sincronizzazione</h2>

        <div className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Periodo</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="w-full h-9 px-3 bg-surface border border-solid rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={syncing}
                />
              </div>
              <span className="text-tertiary text-sm">—</span>
              <div className="flex-1">
                <input
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full h-9 px-3 bg-surface border border-solid rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={syncing}
                />
              </div>
            </div>
          </div>

          {/* Instances Selection */}
          {defaults?.available_instances && defaults.available_instances.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-secondary">Istanze JIRA</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    disabled={syncing}
                    className="text-xs text-accent hover:underline disabled:opacity-50"
                  >
                    Seleziona tutte
                  </button>
                  <span className="text-tertiary">|</span>
                  <button
                    onClick={handleDeselectAll}
                    disabled={syncing}
                    className="text-xs text-secondary hover:underline disabled:opacity-50"
                  >
                    Deseleziona tutte
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {defaults.available_instances.map((instance) => (
                  <label
                    key={instance.name}
                    className={`flex items-center gap-3 p-3 border border-solid rounded-md cursor-pointer transition-colors ${
                      selectedInstances.includes(instance.name) || syncAll
                        ? 'bg-accent-subtle border-accent'
                        : 'bg-surface hover:bg-surface-hover'
                    } ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInstances.includes(instance.name) || syncAll}
                      onChange={() => handleInstanceToggle(instance.name)}
                      disabled={syncing}
                      className="w-4 h-4 text-accent rounded focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{instance.name}</p>
                      <p className="text-xs text-tertiary truncate">{instance.url}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sync Button */}
          <div className="pt-2">
            <Button
              onClick={handleSync}
              disabled={!canSync}
              loading={syncing}
              icon={<RefreshCw size={16} />}
            >
              {syncing ? 'Sincronizzazione in corso...' : 'Avvia Sincronizzazione'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress */}
      {syncing && (
        <Card>
          <h2 className="text-base font-semibold text-primary mb-4">Progresso</h2>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">{currentMessage}</span>
              <span className="font-mono font-medium text-primary">{Math.round(progress)}%</span>
            </div>

            <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Live Logs */}
            <div className="mt-4 max-h-64 overflow-y-auto bg-bg rounded-md p-3 space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="text-xs font-mono text-tertiary">
                  {log.type === 'instance_start' && (
                    <span className="text-accent">→ {log.message}</span>
                  )}
                  {log.type === 'fetching_worklogs' && <span>  📥 {log.message}</span>}
                  {log.type === 'worklogs_fetched' && (
                    <span className="text-success">  ✓ {log.count} worklog trovati</span>
                  )}
                  {log.type === 'enriching' && <span>  🔄 {log.message}</span>}
                  {log.type === 'saving' && <span>  💾 {log.message}</span>}
                  {log.type === 'instance_complete' && (
                    <span className="text-success">
                      ✓ {log.instance}: {log.synced} nuovi, {log.updated} aggiornati, {log.deleted}{' '}
                      eliminati
                    </span>
                  )}
                  {log.type === 'warning' && <span className="text-warning">⚠️ {log.message}</span>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Sync Result */}
      {syncResult && (
        <Card className={syncResult.type === 'error' ? 'border-2 border-error' : 'border-2 border-success'}>
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                syncResult.type === 'error' ? 'bg-error/10' : 'bg-success/10'
              }`}
            >
              {syncResult.type === 'error' ? (
                <XCircle size={24} className="text-error" />
              ) : (
                <CheckCircle size={24} className="text-success" />
              )}
            </div>

            <div className="flex-1">
              <h3
                className={`text-base font-semibold mb-2 ${
                  syncResult.type === 'error' ? 'text-error' : 'text-success'
                }`}
              >
                {syncResult.type === 'error' ? 'Sincronizzazione Fallita' : 'Sincronizzazione Completata'}
              </h3>

              {syncResult.type === 'error' ? (
                <p className="text-sm text-secondary">{syncResult.message}</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-tertiary">Nuovi</p>
                    <p className="text-lg font-semibold text-primary font-mono">
                      {syncResult.worklogs_synced || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary">Aggiornati</p>
                    <p className="text-lg font-semibold text-primary font-mono">
                      {syncResult.worklogs_updated || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary">Eliminati</p>
                    <p className="text-lg font-semibold text-primary font-mono">
                      {syncResult.worklogs_deleted || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Sync History */}
      {history.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-primary mb-4">Storico Sincronizzazioni</h2>

          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-surface rounded-md border border-solid"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'error'
                        ? 'bg-error/10'
                        : item.status === 'completed'
                        ? 'bg-success/10'
                        : 'bg-warning/10'
                    }`}
                  >
                    {item.status === 'error' ? (
                      <XCircle size={16} className="text-error" />
                    ) : item.status === 'completed' ? (
                      <CheckCircle size={16} className="text-success" />
                    ) : (
                      <AlertTriangle size={16} className="text-warning" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-primary">
                        {item.instances?.join(', ') || 'Tutte le istanze'}
                      </p>
                      <Badge variant={item.status === 'completed' ? 'success' : 'default'}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-tertiary">
                      <Clock size={12} className="inline mr-1" />
                      {formatDistanceToNow(new Date(item.started_at), { addSuffix: true, locale: it })}
                    </p>
                  </div>
                </div>

                {item.status === 'completed' && (
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-success">+{item.worklogs_synced}</span>
                    <span className="text-accent">~{item.worklogs_updated}</span>
                    <span className="text-error">-{item.worklogs_deleted}</span>
                  </div>
                )}

                {item.error_message && (
                  <p className="text-xs text-error ml-auto max-w-md truncate">{item.error_message}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
