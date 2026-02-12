import React, { useState, useEffect, useCallback } from 'react'
import { DataTable, Column, Select, Button } from '../components/common'
import { format, startOfMonth, subDays, subMonths, startOfQuarter } from 'date-fns'
import { it } from 'date-fns/locale'
import { X, Download } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getWorklogs, getUsers, getJiraInstances } from '../api/client'

interface WorklogsProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  selectedInstance: string | null
}

interface Worklog {
  id: string
  issue_key: string
  summary: string
  author: string
  duration: number // in seconds
  date: string
  project: string
  rate?: number
  jira_instance?: string
}

// Date range presets
const datePresets = [
  {
    label: 'This Month',
    getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }),
  },
  {
    label: 'Last Month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { start: startOfMonth(lastMonth), end: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0) }
    },
  },
  {
    label: 'This Quarter',
    getRange: () => ({ start: startOfQuarter(new Date()), end: new Date() }),
  },
  {
    label: 'Last 30 Days',
    getRange: () => ({ start: subDays(new Date(), 29), end: new Date() }),
  },
]

export default function Worklogs({ dateRange, selectedInstance }: WorklogsProps) {
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter options (fetched from API)
  const [authorOptions, setAuthorOptions] = useState<Array<{value: string, label: string}>>([])
  const [instanceOptions, setInstanceOptions] = useState<Array<{value: string, label: string}>>([])

  // Filters
  const [filterDateRange, setFilterDateRange] = useState(dateRange)
  const [filterAuthor, setFilterAuthor] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterInstance, setFilterInstance] = useState(selectedInstance || '')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fetch worklogs from backend API
  const fetchWorklogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await getWorklogs({
        startDate: filterDateRange.startDate,
        endDate: filterDateRange.endDate,
        author: filterAuthor || undefined,
        jiraInstance: filterInstance || undefined,
        page: currentPage,
        pageSize,
      })

      setWorklogs(result.worklogs || [])
      setTotalCount(result.total || 0)
    } catch (err: any) {
      setError(err.message)
      setWorklogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [filterDateRange, filterAuthor, filterInstance, currentPage, pageSize])

  useEffect(() => {
    fetchWorklogs()
  }, [fetchWorklogs])

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch users for author filter
        const usersData = await getUsers()
        if (usersData && Array.isArray(usersData)) {
          const authors = usersData.map((user: any) => ({
            value: user.email,
            label: user.full_name || user.email
          }))
          setAuthorOptions(authors)
        }

        // Fetch JIRA instances
        const instancesData = await getJiraInstances()
        if (instancesData && instancesData.instances && Array.isArray(instancesData.instances)) {
          const instances = instancesData.instances.map((inst: any) => ({
            value: inst.name,
            label: inst.name
          }))
          setInstanceOptions(instances)
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }

    fetchFilterOptions()
  }, [])

  // Format duration (seconds to "Xh Ym")
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  // Table columns
  const columns: Column[] = [
    {
      key: 'issue_key',
      label: 'Issue',
      type: 'link',
      width: '120px',
      sortable: true,
      render: (value: string, row: Worklog) => (
        <a
          href={`/app/issues/${value}`}
          className="font-mono text-xs text-accent hover:text-accent-hover"
        >
          {value}
        </a>
      ),
    },
    {
      key: 'summary',
      label: 'Summary',
      type: 'text',
      sortable: true,
      render: (value: string) => (
        <span className="block truncate" style={{ maxWidth: '40ch' }} title={value}>
          {value}
        </span>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      type: 'text',
      width: '150px',
      sortable: true,
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'duration',
      width: '100px',
      sortable: true,
      render: (value: number) => (
        <span className="font-mono text-xs">{formatDuration(value)}</span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      width: '100px',
      sortable: true,
      render: (value: string) => (
        <span className="text-tertiary text-sm">
          {format(new Date(value), 'MMM d', { locale: it })}
        </span>
      ),
    },
    {
      key: 'project',
      label: 'Project',
      type: 'text',
      width: '120px',
      sortable: true,
    },
    {
      key: 'rate',
      label: 'Rate',
      type: 'currency',
      width: '100px',
      sortable: true,
      render: (value: number) =>
        value ? (
          <span className="font-mono text-xs text-right block">${value.toFixed(2)}</span>
        ) : (
          <span className="text-tertiary text-sm">-</span>
        ),
    },
  ]

  // Project filter options (derived from worklogs - to be implemented)
  const projectOptions: Array<{value: string, label: string}> = []

  // Active filters
  const activeFilters = [
    filterAuthor && { key: 'author', label: `Author: ${filterAuthor}`, clear: () => setFilterAuthor('') },
    filterProject && { key: 'project', label: `Project: ${filterProject}`, clear: () => setFilterProject('') },
    filterInstance && { key: 'instance', label: `Instance: ${filterInstance}`, clear: () => setFilterInstance('') },
  ].filter(Boolean)

  const clearAllFilters = () => {
    setFilterAuthor('')
    setFilterProject('')
    setFilterInstance('')
  }

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export worklogs')
  }

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortColumn(key)
    setSortDirection(direction)
  }

  return (
    <div className="space-y-4 max-w-[1920px]">
      {/* Filters Row */}
      <div className="flat-card p-4">
        <div className="grid grid-cols-4 gap-4 mb-3">
          {/* Date Range Picker */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Date Range</label>
            <div className="relative">
              <button
                onClick={() => setDatePickerOpen(!datePickerOpen)}
                className="w-full h-input px-3 bg-surface border border-solid rounded-md text-primary text-sm text-left hover:border-strong transition-colors"
              >
                {format(filterDateRange.startDate, 'MMM d', { locale: it })} -{' '}
                {format(filterDateRange.endDate, 'MMM d', { locale: it })}
              </button>

              {datePickerOpen && (
                <div className="absolute z-50 mt-1 bg-surface border border-solid rounded-md shadow-md p-3">
                  <div className="mb-3 space-y-1">
                    {datePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          const { start, end } = preset.getRange()
                          setFilterDateRange({ startDate: start, endDate: end })
                          setDatePickerOpen(false)
                        }}
                        className="w-full text-left px-2 py-1 text-sm text-primary hover:bg-surface-hover rounded transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <DatePicker
                    selected={filterDateRange.startDate}
                    onChange={(dates: [Date, Date]) => {
                      if (dates[0] && dates[1]) {
                        setFilterDateRange({ startDate: dates[0], endDate: dates[1] })
                        setDatePickerOpen(false)
                      }
                    }}
                    startDate={filterDateRange.startDate}
                    endDate={filterDateRange.endDate}
                    selectsRange
                    inline
                  />
                </div>
              )}
            </div>
          </div>

          {/* Author Filter */}
          <Select
            label="Author"
            options={authorOptions}
            value={filterAuthor}
            onChange={setFilterAuthor}
            searchable
          />

          {/* Project Filter */}
          <Select
            label="Project"
            options={projectOptions}
            value={filterProject}
            onChange={setFilterProject}
            searchable
          />

          {/* Instance Filter */}
          <Select
            label="JIRA Instance"
            options={instanceOptions}
            value={filterInstance}
            onChange={setFilterInstance}
          />
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-secondary">Active filters:</span>
            {activeFilters.map((filter: any) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-accent-subtle text-accent-text text-xs font-medium rounded"
              >
                {filter.label}
                <button
                  onClick={filter.clear}
                  className="hover:text-accent transition-colors"
                  aria-label="Remove filter"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={worklogs}
        loading={loading}
        sortable
        pagination={{
          page: currentPage,
          pageSize,
          total: worklogs.length,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        toolbar={{
          title: 'Worklogs',
          actions: (
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExport}
            >
              Export
            </Button>
          ),
        }}
        onSort={handleSort}
      />
    </div>
  )
}
