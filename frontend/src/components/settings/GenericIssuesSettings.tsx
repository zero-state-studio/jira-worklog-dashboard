import React, { useState, useEffect } from 'react'
import { Card, Badge, Button, Input, Select, MultiSelect } from '../common'
import { Settings, Trash2, Plus, Info } from 'lucide-react'
import { getGenericIssues, addGenericIssue, deleteGenericIssue, getSettingsTeams } from '../../api/client'
import { JIRA_ISSUE_TYPES } from '../../constants/issueTypes'

interface GenericIssue {
  id: number
  issue_code: string
  issue_type: string
  team_id: number | null
  description: string | null
  created_at: string
}

interface Team {
  id: number
  name: string
}

export function GenericIssuesSettings() {
  const [genericIssues, setGenericIssues] = useState<GenericIssue[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // Form state
  const [newIssueCode, setNewIssueCode] = useState('')
  const [newIssueTypes, setNewIssueTypes] = useState<string[]>([])  // Changed to array
  const [newTeamId, setNewTeamId] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [issuesData, teamsData] = await Promise.all([
        getGenericIssues(),
        getSettingsTeams()
      ])
      setGenericIssues(issuesData.generic_issues || [])
      setTeams(teamsData || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load generic issues')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newIssueCode.trim() || newIssueTypes.length === 0) {
      setError('Issue code and at least one issue type are required')
      return
    }

    try {
      setAdding(true)
      setError(null)

      // Join selected types with comma for backend
      const issueTypeString = newIssueTypes.join(',')

      await addGenericIssue(
        newIssueCode.trim(),
        issueTypeString,
        newTeamId ? parseInt(newTeamId, 10) : null,
        newDescription.trim() || null
      )

      // Reset form and reload
      setNewIssueCode('')
      setNewIssueTypes([])
      setNewTeamId('')
      setNewDescription('')
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to add generic issue')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (genericIssueId: number) => {
    if (!confirm('Remove this generic issue mapping?')) return

    try {
      setError(null)
      await deleteGenericIssue(genericIssueId)
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete generic issue')
    }
  }

  const getTeamName = (teamId: number | null): string => {
    if (!teamId) return 'Globale'
    const team = teams.find(t => t.id === teamId)
    return team ? team.name : `Team #${teamId}`
  }

  const teamOptions = [
    { value: '', label: 'Globale (tutti i team)' },
    ...teams.map(t => ({ value: String(t.id), label: t.name }))
  ]

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
            <Settings className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Issue Generiche</h2>
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
          <h2 className="text-base font-semibold text-primary">Issue Generiche</h2>
          <p className="text-xs text-tertiary">
            Mappa issue container a tipi di issue per il matching complementare
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-info-subtle border border-info rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
        <div className="text-xs text-secondary leading-relaxed">
          <strong>Come funziona:</strong> Associa una issue container (es. SYSMMFG-3658) a un tipo
          di issue (es. Incident). I worklog con quel tipo verranno automaticamente collegati alla
          issue container durante il matching. Puoi filtrare per team o lasciare globale.
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-subtle border border-error rounded-lg text-xs text-error">
          {error}
        </div>
      )}

      {/* Add Form */}
      <div className="mb-4 p-4 border border-border rounded-lg bg-surface">
        <h3 className="text-sm font-semibold text-primary mb-3">Aggiungi Mapping</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Issue Code"
            placeholder="es. SYSMMFG-3658"
            value={newIssueCode}
            onChange={(e) => setNewIssueCode(e.target.value)}
          />
          <MultiSelect
            label="Tipo Issue"
            options={[...JIRA_ISSUE_TYPES]}
            value={newIssueTypes}
            onChange={setNewIssueTypes}
            placeholder="Seleziona uno o più tipi"
          />
          <Select
            label="Team"
            options={teamOptions}
            value={newTeamId}
            onChange={(value) => setNewTeamId(value)}
            placeholder="Globale (tutti i team)"
          />
          <Input
            label="Descrizione"
            placeholder="es. Incident generici produzione"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={adding || !newIssueCode.trim() || newIssueTypes.length === 0}
          >
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi
          </Button>
        </div>
      </div>

      {/* Generic Issues Table */}
      {genericIssues.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-tertiary">Nessuna issue generica configurata</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Issue Code</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Tipo</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Team</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Descrizione</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {genericIssues.map((gi) => (
                <tr key={gi.id} className="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors" style={{ height: '36px' }}>
                  <td className="py-2 px-3">
                    <span className="font-mono font-semibold text-primary">{gi.issue_code}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {gi.issue_type.split(',').map((type, idx) => (
                        <Badge key={idx} variant="default">{type.trim()}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    {gi.team_id ? (
                      <Badge variant="info">{getTeamName(gi.team_id)}</Badge>
                    ) : (
                      <span className="text-tertiary text-xs">Globale</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-secondary">
                    {gi.description || <span className="text-tertiary">-</span>}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleDelete(gi.id)}
                      className="p-2 text-error hover:bg-error-subtle rounded transition-colors"
                      aria-label="Delete generic issue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
