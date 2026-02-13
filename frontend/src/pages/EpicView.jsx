import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getIssues, getEpicDetail } from '../api/client'
import { formatHours } from '../hooks/useData'
import { KpiBar, DataTable, Badge, Card, Input } from '../components/common'
import { Search, Target, Clock, Users } from 'lucide-react'

const INSTANCE_COLORS = {
  0: 'var(--color-accent)', // #2563EB
  1: '#16A34A', // green
  2: '#D97706', // orange
  3: '#8B5CF6', // purple
  4: '#EC4899', // pink
}

export default function EpicView({ dateRange, selectedInstance }) {
  const { epicKey } = useParams()
  const navigate = useNavigate()
  const [listData, setListData] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (epicKey) {
        // Fetch epic detail
        const result = await getEpicDetail(epicKey, dateRange.startDate, dateRange.endDate, selectedInstance)
        setDetailData(result)
        setListData(null)
      } else {
        // Fetch issue list (epics/initiatives)
        const result = await getIssues(dateRange.startDate, dateRange.endDate, selectedInstance)
        setListData(result)
        setDetailData(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [epicKey, dateRange.startDate, dateRange.endDate, selectedInstance])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1920px]">
        <div className="h-8 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1920px]">
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-error text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Error Loading Data</h3>
            <p className="text-sm text-tertiary mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-accent text-inverse rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    )
  }

  // Epic Detail View
  if (detailData) {
    return <EpicDetailView data={detailData} navigate={navigate} dateRange={dateRange} />
  }

  // Issue List View (Epics/Initiatives)
  if (listData) {
    return <IssueListView
      data={listData}
      navigate={navigate}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
    />
  }

  return null
}

// ========== Issue List View (Epics/Initiatives) ==========
function IssueListView({ data, navigate, searchQuery, setSearchQuery, typeFilter, setTypeFilter }) {
  // Build unique instance list for color assignment
  const uniqueInstances = [...new Set(data.issues.map(i => i.jira_instance))].sort()

  // Count by parent_type
  const typeCounts = {}
  for (const issue of data.issues) {
    const t = issue.parent_type || 'Other'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  }

  // Apply type filter, then search filter
  const typeFiltered = typeFilter === 'all'
    ? data.issues
    : data.issues.filter(i => (i.parent_type || 'Other') === typeFilter)

  const filteredIssues = typeFiltered.filter(issue => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      issue.issue_key.toLowerCase().includes(query) ||
      issue.issue_summary.toLowerCase().includes(query) ||
      (issue.parent_key && issue.parent_key.toLowerCase().includes(query)) ||
      (issue.parent_name && issue.parent_name.toLowerCase().includes(query))
    )
  })

  const filteredHours = filteredIssues.reduce((sum, i) => sum + i.total_hours, 0)
  const filteredContributors = new Set(filteredIssues.flatMap(i => i.contributors || [])).size

  // KPI Items
  const kpiItems = [
    {
      label: 'Total Issues',
      value: filteredIssues.length,
      icon: <Target size={16} />,
    },
    {
      label: 'Total Hours',
      value: formatHours(filteredHours),
      icon: <Clock size={16} />,
    },
    {
      label: 'Contributors',
      value: filteredContributors,
      icon: <Users size={16} />,
    },
    {
      label: 'Avg Hours/Issue',
      value: filteredIssues.length > 0 ? formatHours(filteredHours / filteredIssues.length) : '0h',
    },
  ]

  // Table columns
  const columns = [
    {
      key: 'issue_key',
      label: 'Issue',
      type: 'text',
      width: '120px',
      render: (value) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: 'issue_summary',
      label: 'Title',
      type: 'text',
      render: (value) => (
        <span className="text-sm text-primary block truncate max-w-md">{value}</span>
      ),
    },
    {
      key: 'parent_name',
      label: 'Initiative',
      type: 'text',
      width: '200px',
      render: (value) => (
        <span className="text-xs text-tertiary block truncate">{value || '-'}</span>
      ),
    },
    {
      key: 'jira_instance',
      label: 'Instance',
      type: 'text',
      width: '120px',
      render: (value, row) => {
        const instIdx = uniqueInstances.indexOf(value)
        const color = INSTANCE_COLORS[instIdx >= 0 ? instIdx % Object.keys(INSTANCE_COLORS).length : 0]
        return (
          <span
            className="text-xs px-2 py-0.5 rounded-md font-medium inline-block"
            style={{
              backgroundColor: `${color}15`,
              color: color === 'var(--color-accent)' ? 'var(--color-accent)' : color,
            }}
          >
            {value}
          </span>
        )
      },
    },
    {
      key: 'total_hours',
      label: 'Hours',
      type: 'text',
      width: '100px',
      render: (value) => <span className="font-mono text-xs font-medium">{formatHours(value)}</span>,
    },
    {
      key: 'contributor_count',
      label: 'Contributors',
      type: 'number',
      width: '100px',
      render: (value) => <span className="font-mono text-xs">{value || 0}</span>,
    },
  ]

  // Table data
  const tableData = filteredIssues.map((issue) => ({
    id: issue.issue_key,
    issue_key: issue.issue_key,
    issue_summary: issue.issue_summary,
    parent_name: issue.parent_name,
    jira_instance: issue.jira_instance,
    total_hours: issue.total_hours,
    contributor_count: issue.contributor_count || 0,
    onClick: () => navigate(`/app/issues/${encodeURIComponent(issue.issue_key)}`),
  }))

  return (
    <div className="space-y-6 max-w-[1920px]">
      {/* Breadcrumb */}
      <div className="text-xs text-tertiary">
        <span>Workspace</span> <span className="mx-2">/</span> <span className="text-primary">Epics</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary mb-1">Epics & Initiatives</h1>
            <p className="text-sm text-tertiary">
              {searchQuery || typeFilter !== 'all'
                ? `${filteredIssues.length} of ${data.total_count} issues`
                : `${data.total_count} issues with logged hours in period`
              }
            </p>
          </div>
        </div>
      </div>

      {/* KPI Bar */}
      <KpiBar items={kpiItems} />

      {/* Type Filter Tabs */}
      {Object.keys(typeCounts).length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`h-[28px] px-3 text-xs font-medium rounded-md transition-colors ${
              typeFilter === 'all'
                ? 'bg-accent-subtle text-accent-text'
                : 'bg-transparent text-secondary hover:bg-surface-hover'
            }`}
          >
            All ({data.total_count})
          </button>
          {Object.entries(typeCounts).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`h-[28px] px-3 text-xs font-medium rounded-md transition-colors ${
                typeFilter === type
                  ? 'bg-accent-subtle text-accent-text'
                  : 'bg-transparent text-secondary hover:bg-surface-hover'
              }`}
            >
              {type} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
          <input
            type="text"
            placeholder="Search by issue key, title, or initiative..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-3 bg-surface border border-solid rounded-md text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
          />
        </div>
      </div>

      {/* Issues Table */}
      {filteredIssues.length > 0 ? (
        <DataTable
          columns={columns}
          data={tableData}
          sortable
          onRowClick={(row) => row.onClick?.()}
          toolbar={{
            title: `${filteredIssues.length} ${filteredIssues.length === 1 ? 'Issue' : 'Issues'}${searchQuery || typeFilter !== 'all' ? ` (filtered from ${data.total_count})` : ''}`,
          }}
        />
      ) : (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-tertiary" />
            </div>
            <h3 className="text-base font-medium text-primary mb-2">No issues found</h3>
            <p className="text-sm text-tertiary">
              {searchQuery ? 'Try adjusting your search query' : 'No issues with logged hours in this period'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-accent text-inverse rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// ========== Epic Detail View ==========
function EpicDetailView({ data, navigate, dateRange }) {
  // KPI Items
  const kpiItems = [
    {
      label: 'Total Hours',
      value: formatHours(data.total_hours || 0),
      icon: <Clock size={16} />,
    },
    {
      label: 'Issues',
      value: data.issue_count || 0,
      icon: <Target size={16} />,
    },
    {
      label: 'Contributors',
      value: data.contributor_count || 0,
      icon: <Users size={16} />,
    },
    {
      label: 'Avg Hours/Issue',
      value: data.issue_count > 0 ? formatHours(data.total_hours / data.issue_count) : '0h',
    },
  ]

  // Table columns for child issues
  const columns = [
    {
      key: 'issue_key',
      label: 'Issue',
      type: 'text',
      width: '120px',
      render: (value) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      render: (value) => (
        <span className="text-sm text-primary block truncate max-w-md">{value}</span>
      ),
    },
    {
      key: 'hours',
      label: 'Hours',
      type: 'text',
      width: '100px',
      render: (value) => <span className="font-mono text-xs font-medium">{formatHours(value)}</span>,
    },
    {
      key: 'contributors',
      label: 'Contributors',
      type: 'number',
      width: '100px',
      render: (value) => <span className="font-mono text-xs">{value || 0}</span>,
    },
  ]

  const tableData = (data.issues || []).map((issue) => ({
    id: issue.issue_key,
    issue_key: issue.issue_key,
    summary: issue.summary || issue.issue_summary,
    hours: issue.total_hours || issue.hours || 0,
    contributors: issue.contributor_count || issue.contributors || 0,
    onClick: () => navigate(`/app/issues/${encodeURIComponent(issue.issue_key)}`),
  }))

  return (
    <div className="space-y-6 max-w-[1920px]">
      {/* Breadcrumb */}
      <div className="text-xs text-tertiary">
        <span
          onClick={() => navigate('/app/epics')}
          className="hover:text-primary cursor-pointer transition-colors"
        >
          Epics
        </span>
        <span className="mx-2">/</span>
        <span className="text-primary">{data.epic_key || data.parent_key}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="default">{data.epic_key || data.parent_key}</Badge>
          <h1 className="text-xl font-semibold text-primary">{data.epic_name || data.parent_name}</h1>
        </div>
        <p className="text-sm text-tertiary">
          Epic details and child issues
        </p>
      </div>

      {/* KPI Bar */}
      <KpiBar items={kpiItems} />

      {/* Child Issues Table */}
      {tableData.length > 0 ? (
        <DataTable
          columns={columns}
          data={tableData}
          sortable
          onRowClick={(row) => row.onClick?.()}
          toolbar={{
            title: `${tableData.length} ${tableData.length === 1 ? 'Issue' : 'Issues'}`,
          }}
        />
      ) : (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
              <Target size={32} className="text-tertiary" />
            </div>
            <h3 className="text-base font-medium text-primary mb-2">No child issues</h3>
            <p className="text-sm text-tertiary">
              This epic has no child issues with logged hours in the selected period
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
