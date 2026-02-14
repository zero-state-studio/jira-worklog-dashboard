import React, { useState, useEffect } from 'react'
import { Card, Badge, Button, Input } from '../common'
import { Settings, Trash2, Plus, Info } from 'lucide-react'
import { getJiraExclusions, addJiraExclusion, deleteJiraExclusion } from '../../api/client'

interface JiraExclusion {
  id: number
  exclusion_key: string
  exclusion_type: string
  description: string
  created_at: string
}

export function JiraExclusionsSettings() {
  const [exclusions, setExclusions] = useState<JiraExclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // Form state
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState('parent_key')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    fetchExclusions()
  }, [])

  const fetchExclusions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getJiraExclusions()
      setExclusions(data.exclusions || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load JIRA exclusions')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newKey.trim()) {
      setError('Exclusion key is required')
      return
    }

    try {
      setAdding(true)
      setError(null)
      await addJiraExclusion(
        newKey.trim(),
        newType,
        newDescription.trim() || null
      )

      // Reset form and reload
      setNewKey('')
      setNewDescription('')
      await fetchExclusions()
    } catch (err: any) {
      setError(err.message || 'Failed to add exclusion')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (exclusionId: number) => {
    if (!confirm('Remove this exclusion?')) return

    try {
      setError(null)
      await deleteJiraExclusion(exclusionId)
      await fetchExclusions()
    } catch (err: any) {
      setError(err.message || 'Failed to delete exclusion')
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
            <Settings className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Esclusioni JIRA</h2>
            <p className="text-xs text-tertiary">Loading...</p>
          </div>
        </div>
        <div className="h-24 bg-surface-secondary rounded animate-pulse" />
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
          <Settings className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary">Esclusioni JIRA</h2>
          <p className="text-xs text-tertiary">
            Configura issue/parent key da escludere dagli algoritmi di match
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-info-subtle border border-info rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
        <div className="text-xs text-secondary leading-relaxed">
          <strong>Come funziona:</strong> Le issue con questi parent key (es. ASS, FORM) non verranno
          considerate errori negli algoritmi di match. Appariranno nella Dashboard con badge{' '}
          <Badge variant="success" className="text-xs mx-1">OK</Badge> invece di{' '}
          <Badge variant="error" className="text-xs mx-1">Error</Badge>.
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-subtle border border-error rounded-lg text-xs text-error">
          {error}
        </div>
      )}

      {/* Add Form */}
      <div className="mb-4 p-4 border border-border rounded-lg bg-surface">
        <h3 className="text-sm font-semibold text-primary mb-3">Aggiungi Esclusione</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Parent/Issue Key"
            placeholder="es. ASS, FORM, ADMIN"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <Input
            label="Descrizione"
            placeholder="es. Assenze (ferie, malattia)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={adding || !newKey.trim()}
          >
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi
          </Button>
        </div>
      </div>

      {/* Exclusions List */}
      {exclusions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-tertiary">Nessuna esclusione configurata</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exclusions.map((exclusion) => (
            <div
              key={exclusion.id}
              className="p-3 border border-border rounded-lg hover:border-accent transition-colors flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-semibold text-primary">
                    {exclusion.exclusion_key}
                  </span>
                  <Badge variant="default" className="text-xs">parent_key</Badge>
                </div>
                {exclusion.description && (
                  <p className="text-xs text-secondary">{exclusion.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(exclusion.id)}
                className="p-2 text-error hover:bg-error-subtle rounded transition-colors"
                aria-label="Delete exclusion"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
