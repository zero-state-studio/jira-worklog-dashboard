import React, { useState } from 'react'
import { Card, Badge } from '../common'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatHours } from '../../hooks/useData'

interface InstanceMember {
  instance: string
  hours: number
  worklogCount: number
  contributors: number
  availableHours: number
  utilization: number
  isPrimary: boolean
}

interface InstanceRow {
  instance: string
  hours: number
  worklogCount: number
  contributors: number
  availableHours: number
  utilization: number
  isGroup: boolean
  members?: InstanceMember[]
  groupName?: string
  discrepancyCount?: number
  delta?: number
}

interface InstanceOverviewTableProps {
  instances: InstanceRow[]
  onDiscrepancyClick?: (groupName: string) => void
}

export function InstanceOverviewTable({ instances, onDiscrepancyClick }: InstanceOverviewTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleExpand = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  // Calculate totals
  const totalHours = instances.reduce((sum, inst) => sum + inst.hours, 0)
  const totalWorklogs = instances.reduce((sum, inst) => sum + inst.worklogCount, 0)
  const totalContributors = instances.reduce((sum, inst) => {
    // Count unique contributors (avoid double-counting in complementary groups)
    return inst.isGroup ? Math.max(sum, inst.contributors) : sum + inst.contributors
  }, 0)
  const totalAvailable = instances.reduce((sum, inst) => sum + inst.availableHours, 0)
  const totalUtilization = totalAvailable > 0 ? (totalHours / totalAvailable) * 100 : 0

  const renderStatusBadge = (row: InstanceRow) => {
    if (!row.isGroup || !row.discrepancyCount) {
      return <span className="text-xs text-tertiary">—</span>
    }

    const count = row.discrepancyCount
    const delta = row.delta || 0

    if (Math.abs(delta) < 0.5) {
      return (
        <Badge variant="success">
          <CheckCircle className="w-3 h-3" />
          Aligned
        </Badge>
      )
    }

    const variant = count >= 10 ? 'error' : 'warning'
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDiscrepancyClick?.(row.groupName!)
        }}
        className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        <Badge variant={variant}>
          <AlertTriangle className="w-3 h-3" />
          {count} discrepanc{count === 1 ? 'y' : 'ies'}
        </Badge>
      </button>
    )
  }

  const renderUtilizationBar = (utilization: number) => {
    const percentage = Math.min(utilization, 150) // Cap display at 150%
    const color =
      utilization < 50
        ? 'bg-warning'
        : utilization >= 50 && utilization < 85
        ? 'bg-accent'
        : utilization >= 85 && utilization <= 100
        ? 'bg-success'
        : 'bg-error'

    return (
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-mono font-medium ${
            utilization < 50
              ? 'text-warning'
              : utilization >= 50 && utilization < 85
              ? 'text-accent'
              : utilization >= 85 && utilization <= 100
              ? 'text-success'
              : 'text-error'
          }`}
        >
          {Math.round(utilization)}%
        </span>
        <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden min-w-[60px]">
          <div
            className={`h-full ${color} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  const renderRow = (row: InstanceRow, isChild = false, isPrimary = false) => {
    const isExpanded = row.groupName && expandedGroups.has(row.groupName)
    const hasMembers = row.isGroup && row.members && row.members.length > 1

    return (
      <tr
        key={isChild ? `${row.groupName}-${row.instance}` : row.instance}
        className={`
          border-b border-border transition-colors
          ${hasMembers ? 'cursor-pointer hover:bg-surface-hover' : ''}
          ${isChild ? 'bg-surface-secondary' : ''}
        `}
        onClick={() => hasMembers && toggleExpand(row.groupName!)}
      >
        {/* INSTANCE */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {hasMembers && (
              <div className="w-4 h-4 flex items-center justify-center text-secondary">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>
            )}
            {isChild && <span className="text-xs text-tertiary ml-6 mr-1">└</span>}
            <span className={`text-sm ${isChild ? 'text-secondary' : 'text-primary font-medium'}`}>
              {row.instance}
              {isPrimary && <span className="ml-2 text-xs text-accent">(primary)</span>}
            </span>
          </div>
        </td>

        {/* HOURS */}
        <td className="py-3 px-4">
          <span className="text-xs font-mono text-primary">{formatHours(row.hours)}</span>
        </td>

        {/* WORKLOGS */}
        <td className="py-3 px-4">
          <span className="text-xs font-mono text-secondary">{row.worklogCount}</span>
        </td>

        {/* CONTRIBUTORS */}
        <td className="py-3 px-4">
          <span className="text-xs font-mono text-secondary">{row.contributors}</span>
        </td>

        {/* AVAILABLE */}
        <td className="py-3 px-4">
          <span className="text-xs font-mono text-tertiary">{formatHours(row.availableHours)}</span>
        </td>

        {/* UTILIZATION */}
        <td className="py-3 px-4 min-w-[180px]">{renderUtilizationBar(row.utilization)}</td>

        {/* STATUS */}
        <td className="py-3 px-4">{!isChild && renderStatusBadge(row)}</td>
      </tr>
    )
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-primary">Instance Overview</h2>
        <p className="text-xs text-tertiary">Hours worked across all JIRA instances</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-strong">
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Instance
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Hours
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Worklogs
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Contributors
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Available
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Utilization
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {instances.map((row) => (
              <React.Fragment key={row.instance}>
                {renderRow(row)}
                {/* Expanded child rows */}
                {row.isGroup &&
                  row.groupName &&
                  expandedGroups.has(row.groupName) &&
                  row.members?.map((member) =>
                    renderRow(
                      {
                        instance: member.instance,
                        hours: member.hours,
                        worklogCount: member.worklogCount,
                        contributors: member.contributors,
                        availableHours: member.availableHours,
                        utilization: member.utilization,
                        isGroup: false,
                        groupName: row.groupName,
                      },
                      true,
                      member.isPrimary
                    )
                  )}
                {/* Delta row after expanded members */}
                {row.isGroup &&
                  row.groupName &&
                  expandedGroups.has(row.groupName) &&
                  row.members &&
                  row.members.length === 2 && (
                    <tr className="border-b border-border bg-surface-secondary">
                      <td className="py-2 px-4" colSpan={7}>
                        <div className="flex items-center gap-2 ml-10 text-xs">
                          <span className="text-tertiary">Delta:</span>
                          <span
                            className={`font-mono font-medium ${
                              (row.delta || 0) > 0 ? 'text-warning' : 'text-success'
                            }`}
                          >
                            {(row.delta || 0) > 0 ? '+' : ''}
                            {formatHours(row.delta || 0)}
                          </span>
                          <span className="text-tertiary">|</span>
                          <span
                            className={`font-mono font-medium ${
                              (row.members[0].worklogCount - row.members[1].worklogCount) > 0
                                ? 'text-warning'
                                : 'text-success'
                            }`}
                          >
                            {(row.members[0].worklogCount - row.members[1].worklogCount) > 0 ? '+' : ''}
                            {row.members[0].worklogCount - row.members[1].worklogCount} worklogs
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
              </React.Fragment>
            ))}

            {/* TOTAL ROW */}
            <tr className="border-t-2 border-border-strong bg-surface-secondary font-medium">
              <td className="py-3 px-4">
                <span className="text-sm text-primary font-semibold">TOTAL</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs font-mono text-primary font-semibold">
                  {formatHours(totalHours)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs font-mono text-primary font-semibold">{totalWorklogs}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs font-mono text-primary font-semibold">{totalContributors}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs font-mono text-tertiary">{formatHours(totalAvailable)}</span>
              </td>
              <td className="py-3 px-4 min-w-[180px]">{renderUtilizationBar(totalUtilization)}</td>
              <td className="py-3 px-4"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
