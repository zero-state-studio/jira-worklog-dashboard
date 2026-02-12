import React, { useState, useEffect, useCallback } from 'react'
import { DataTable, Column, Badge, Button, Modal, Input, Select } from '../components/common'
import { Search, Plus, Edit, Trash2, UserPlus } from 'lucide-react'
import { getDashboard, getTeamDetail, createTeam, updateTeam, deleteTeam } from '../api/client'

interface Team {
  name: string
  description?: string
  member_count: number
  total_hours: number
  expected_hours: number
}

interface TeamMember {
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
  total_hours: number
}

interface Worklog {
  id: string
  issue_key: string
  summary: string
  author: string
  duration: number
  date: string
  project: string
}

export default function NewTeams({ dateRange, selectedInstance }: {
  dateRange: { startDate: Date; endDate: Date }
  selectedInstance: string | null
}) {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamDetail, setTeamDetail] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'members' | 'worklogs'>('members')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // Modal states
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  // Load teams
  const loadTeams = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getDashboard(dateRange.startDate, dateRange.endDate, selectedInstance)
      setTeams(result.teams || [])
      if (result.teams && result.teams.length > 0 && !selectedTeam) {
        setSelectedTeam(result.teams[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, selectedInstance, selectedTeam])

  // Load team detail
  const loadTeamDetail = useCallback(async (teamName: string) => {
    try {
      setDetailLoading(true)
      const result = await getTeamDetail(teamName, dateRange.startDate, dateRange.endDate, selectedInstance)
      setTeamDetail(result)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, selectedInstance])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetail(selectedTeam.name)
    }
  }, [selectedTeam, loadTeamDetail])

  // Filter teams by search
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Members columns
  const membersColumns: Column[] = [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      render: (_: any, row: TeamMember) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-inverse">
              {row.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-primary">{row.name || row.email}</p>
            <p className="text-xs text-tertiary">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      type: 'badge',
      width: '120px',
      render: (value: string) => {
        const variantMap: Record<string, 'default' | 'info' | 'success'> = {
          ADMIN: 'error',
          MANAGER: 'info',
          USER: 'default',
        }
        return <Badge variant={variantMap[value] || 'default'}>{value}</Badge>
      },
    },
    {
      key: 'total_hours',
      label: 'Hours',
      type: 'duration',
      width: '100px',
      render: (value: number) => (
        <span className="font-mono text-sm">{value?.toFixed(1) || '0.0'}h</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      type: 'actions',
      width: '120px',
      render: (_: any, row: TeamMember) => (
        <div className="flex items-center gap-2">
          <button className="p-1 text-secondary hover:text-primary transition-colors">
            <Edit size={14} />
          </button>
          <button className="p-1 text-secondary hover:text-error transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  // Worklogs columns
  const worklogsColumns: Column[] = [
    {
      key: 'issue_key',
      label: 'Issue',
      type: 'link',
      width: '120px',
      render: (value: string) => (
        <a href={`/app/issues/${value}`} className="font-mono text-xs text-accent hover:text-accent-hover">
          {value}
        </a>
      ),
    },
    { key: 'summary', label: 'Summary', type: 'text' },
    { key: 'author', label: 'Author', type: 'text', width: '150px' },
    {
      key: 'duration',
      label: 'Duration',
      type: 'duration',
      width: '100px',
      render: (value: number) => {
        const hours = Math.floor(value / 3600)
        const minutes = Math.floor((value % 3600) / 60)
        return <span className="font-mono text-xs">{hours}h {minutes > 0 ? `${minutes}m` : ''}</span>
      },
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      width: '100px',
      render: (value: string) => (
        <span className="text-sm text-tertiary">{value}</span>
      ),
    },
  ]

  return (
    <div className="flex h-[calc(100vh-48px-48px)] overflow-hidden max-w-[1920px]">
      {/* Left Panel - Team List */}
      <div className="w-[280px] border-r border-solid flex flex-col bg-surface">
        {/* Search */}
        <div className="p-4 border-b border-solid">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={14} />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-input pl-9 pr-3 bg-surface-secondary border border-solid rounded-md text-primary text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Team List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-secondary text-sm">Loading...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-4 text-center text-tertiary text-sm">No teams found</div>
          ) : (
            <div className="space-y-1">
              {filteredTeams.map((team) => (
                <button
                  key={team.name}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    selectedTeam?.name === team.name
                      ? 'bg-surface-active border-l-2 border-accent'
                      : 'hover:bg-surface-hover'
                  }`}
                >
                  <p className="text-sm font-medium text-primary mb-1">{team.name}</p>
                  <p className="text-xs text-tertiary">
                    {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Team Button */}
        <div className="p-4 border-t border-solid">
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditingTeam(null)
              setShowCreateTeamModal(true)
            }}
            className="w-full"
          >
            New Team
          </Button>
        </div>
      </div>

      {/* Right Panel - Team Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTeam ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-solid">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-primary">{selectedTeam.name}</h2>
                  {selectedTeam.description && (
                    <p className="text-sm text-secondary mt-1">{selectedTeam.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-tertiary">
                      <span className="font-medium text-primary">{selectedTeam.member_count}</span> members
                    </span>
                    <span className="text-tertiary">
                      <span className="font-medium text-primary">{selectedTeam.total_hours.toFixed(1)}h</span> tracked
                    </span>
                    <span className="text-tertiary">
                      <span className="font-medium text-primary">
                        {selectedTeam.expected_hours > 0
                          ? Math.round((selectedTeam.total_hours / selectedTeam.expected_hours) * 100)
                          : 0}%
                      </span>{' '}
                      completion
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit size={14} />}
                    onClick={() => {
                      setEditingTeam(selectedTeam)
                      setShowCreateTeamModal(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={async () => {
                      if (confirm(`Delete team "${selectedTeam.name}"?`)) {
                        try {
                          // Note: Assuming team has an id field. If not, may need to use name or fetch team id first
                          await deleteTeam((selectedTeam as any).id)
                          setSelectedTeam(null)
                          loadTeams()
                        } catch (err) {
                          console.error('Failed to delete team:', err)
                          alert('Failed to delete team. Please try again.')
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-solid">
              <div className="flex gap-6 px-6">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'members'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Members
                </button>
                <button
                  onClick={() => setActiveTab('worklogs')}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'worklogs'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Worklogs
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-secondary">Loading...</p>
                </div>
              ) : (
                <>
                  {/* Members Tab */}
                  {activeTab === 'members' && (
                    <DataTable
                      columns={membersColumns}
                      data={teamDetail?.members || []}
                      toolbar={{
                        title: `${teamDetail?.members?.length || 0} Members`,
                        actions: (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<UserPlus size={14} />}
                            onClick={() => setShowAddMemberModal(true)}
                          >
                            Add Member
                          </Button>
                        ),
                      }}
                    />
                  )}

                  {/* Worklogs Tab */}
                  {activeTab === 'worklogs' && (
                    <DataTable
                      columns={worklogsColumns}
                      data={(teamDetail?.worklogs || []).map((w: any) => ({
                        id: w.id,
                        issue_key: w.issue_key,
                        summary: w.issue_summary || '',
                        author: w.author_display_name || w.author_email,
                        duration: w.time_spent_seconds,
                        date: w.started?.split('T')[0] || w.started,
                        project: w.epic_key || (w.issue_key?.split('-')[0] || ''),
                      }))}
                      sortable
                      pagination={{
                        page: 1,
                        pageSize: 50,
                        total: teamDetail?.worklogs?.length || 0,
                        onPageChange: () => {},
                        onPageSizeChange: () => {},
                      }}
                      toolbar={{
                        title: `${teamDetail?.worklogs?.length || 0} Worklogs`,
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-secondary mb-4">Select a team to view details</p>
              <Button
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  setEditingTeam(null)
                  setShowCreateTeamModal(true)
                }}
              >
                Create First Team
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TeamModal
        isOpen={showCreateTeamModal}
        team={editingTeam}
        onClose={() => setShowCreateTeamModal(false)}
        onSave={async (data) => {
          try {
            if (editingTeam && (editingTeam as any).id) {
              // Update existing team
              await updateTeam((editingTeam as any).id, data)
            } else {
              // Create new team
              await createTeam(data.name)
            }
            setShowCreateTeamModal(false)
            loadTeams()
          } catch (err) {
            console.error('Failed to save team:', err)
            alert('Failed to save team. Please try again.')
          }
        }}
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        teamName={selectedTeam?.name || ''}
        onClose={() => setShowAddMemberModal(false)}
        onSave={async (data) => {
          try {
            // Note: Adding members to team requires either:
            // 1. A dedicated POST /api/settings/teams/{id}/members endpoint (not implemented yet)
            // 2. Updating team with new member list via updateTeam
            // For now, log the action. Backend endpoint needed.
            console.log('Add member to team:', selectedTeam?.name, data)
            alert('Add member functionality requires backend endpoint implementation')
            setShowAddMemberModal(false)
            if (selectedTeam) {
              loadTeamDetail(selectedTeam.name)
            }
          } catch (err) {
            console.error('Failed to add member:', err)
            alert('Failed to add member. Please try again.')
          }
        }}
      />
    </div>
  )
}

// ============ MODAL COMPONENTS ============

interface TeamModalProps {
  isOpen: boolean
  team: Team | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function TeamModal({ isOpen, team, onClose, onSave }: TeamModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (team) {
      setName(team.name)
      setDescription(team.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [team])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={team ? 'Edit Team' : 'Create Team'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              setSaving(true)
              await onSave({ name, description })
              setSaving(false)
            }}
            disabled={!name || saving}
            loading={saving}
          >
            {team ? 'Save' : 'Create Team'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Team Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
        />
      </div>
    </Modal>
  )
}

interface AddMemberModalProps {
  isOpen: boolean
  teamName: string
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function AddMemberModal({ isOpen, teamName, onClose, onSave }: AddMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('USER')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setRole('USER')
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Team Member"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              setSaving(true)
              await onSave({ team_name: teamName, email, role })
              setSaving(false)
            }}
            disabled={!email || saving}
            loading={saving}
          >
            Add Member
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          autoFocus
        />
        <Select
          label="Role"
          options={[
            { value: 'USER', label: 'Member' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
          value={role}
          onChange={setRole}
        />
      </div>
    </Modal>
  )
}
