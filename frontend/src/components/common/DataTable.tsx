import React, { useState } from 'react'

// Column type definitions
export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'duration' | 'link' | 'badge' | 'actions'

export interface Column<T = any> {
  key: string
  label: string
  type?: ColumnType
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}

export interface DataTableProps<T = any> {
  // Data
  columns: Column<T>[]
  data: T[]
  loading?: boolean

  // Features
  selectable?: boolean
  sortable?: boolean

  // Pagination
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }

  // Toolbar
  toolbar?: {
    title?: string
    actions?: React.ReactNode
  }

  // Callbacks
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onRowSelect?: (selectedIds: string[]) => void

  // Styling
  className?: string
}

/**
 * DataTable Component
 *
 * Enterprise-grade data table with sorting, pagination, and multiple column types.
 * - Table header: sticky, bg surface-secondary, 11px uppercase
 * - Rows: 36px height, 13px text, hover bg surface-hover
 * - NO stripe alternating, NO heavy borders
 *
 * @example
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   pagination={paginationConfig}
 *   toolbar={{ title: "Users", actions: <Button>Add User</Button> }}
 * />
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  selectable = false,
  sortable = true,
  pagination,
  toolbar,
  onSort,
  onRowSelect,
  className = '',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Handle sort
  const handleSort = (key: string) => {
    if (!sortable) return

    const newDirection = sortColumn === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(key)
    setSortDirection(newDirection)
    onSort?.(key, newDirection)
  }

  // Handle row selection
  const handleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
      onRowSelect?.([])
    } else {
      const allIds = new Set(data.map((row) => row.id))
      setSelectedIds(allIds)
      onRowSelect?.(Array.from(allIds))
    }
  }

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    onRowSelect?.(Array.from(newSelected))
  }

  // Column type renderers
  const renderCell = (column: Column<T>, value: any, row: T) => {
    if (column.render) {
      return column.render(value, row)
    }

    switch (column.type) {
      case 'number':
      case 'currency':
        return (
          <span className="font-mono text-xs text-right block">
            {column.type === 'currency' ? `$${Number(value).toLocaleString()}` : value}
          </span>
        )
      case 'date':
        return <span className="text-tertiary">{value}</span>
      case 'duration':
        return <span className="font-mono text-xs">{value}</span>
      case 'link':
        return (
          <a href="#" className="text-accent hover:text-accent-hover font-mono text-xs">
            {value}
          </a>
        )
      case 'text':
      default:
        return (
          <span className="block truncate" title={value}>
            {value}
          </span>
        )
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={className}>
        {toolbar && (
          <div className="mb-4 flex items-center justify-between">
            <div className="h-8 w-32 bg-surface-secondary rounded animate-pulse" />
            <div className="h-8 w-24 bg-surface-secondary rounded animate-pulse" />
          </div>
        )}
        <div className="border border-solid rounded-lg overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[36px] border-b border-solid bg-surface-hover animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={className}>
        {toolbar && (
          <div className="mb-4 flex items-center justify-between">
            {toolbar.title && <h2 className="text-xl font-semibold text-primary">{toolbar.title}</h2>}
            {toolbar.actions && <div className="flex items-center gap-2">{toolbar.actions}</div>}
          </div>
        )}
        <div className="border border-solid rounded-lg bg-surface p-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-tertiary mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-sm text-secondary">No data found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      {toolbar && (
        <div className="mb-4 flex items-center justify-between">
          {toolbar.title && <h2 className="text-xl font-semibold text-primary">{toolbar.title}</h2>}
          {toolbar.actions && <div className="flex items-center gap-2">{toolbar.actions}</div>}
        </div>
      )}

      {/* Selection toolbar */}
      {selectable && selectedIds.size > 0 && (
        <div className="mb-4 px-4 py-3 bg-accent-subtle border border-solid rounded-md flex items-center justify-between">
          <span className="text-sm font-medium text-accent-text">
            {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
          </span>
          <button
            type="button"
            className="text-sm text-accent hover:text-accent-hover font-medium"
            onClick={() => {
              setSelectedIds(new Set())
              onRowSelect?.([])
            }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-solid rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-surface-secondary sticky top-0 z-10">
              <tr>
                {selectable && (
                  <th className="px-3 py-2 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-2 text-left text-xs uppercase font-semibold text-secondary tracking-wider ${
                      column.sortable && sortable ? 'cursor-pointer hover:text-primary' : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column.label}</span>
                      {column.sortable && sortable && sortColumn === column.key && (
                        <svg
                          className={`w-3 h-3 transition-transform ${
                            sortDirection === 'desc' ? 'rotate-180' : ''
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="border-b border-solid hover:bg-surface-hover transition-colors"
                >
                  {selectable && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 text-sm text-primary align-middle h-[36px]">
                      {renderCell(column, row[column.key], row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="mt-4 flex items-center justify-between px-3 py-2 bg-surface border border-solid rounded-md">
          <div className="text-sm text-secondary">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </div>

          <div className="flex items-center gap-4">
            {/* Page size selector */}
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-solid rounded bg-surface text-primary cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-2 py-1 text-sm border border-solid rounded bg-surface text-primary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>

              {/* Page numbers (simplified - shows current page) */}
              <span className="px-3 py-1 text-sm font-medium text-primary">
                {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}
              </span>

              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                className="px-2 py-1 text-sm border border-solid rounded bg-surface text-primary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
