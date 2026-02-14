import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button } from '../common'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { formatHours } from '../../hooks/useData'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface DiscrepancyGroup {
  initiative_key: string
  initiative_name: string
  primary_hours: number
  secondary_hours: number
  delta_hours: number
  delta_percentage: number
  is_excluded?: boolean  // True if this is an expected discrepancy (e.g., leaves, training)
}

interface DiscrepancyData {
  groupName: string
  primaryInstance: string
  secondaryInstance: string
  primaryHours: number
  secondaryHours: number
  delta: number
  discrepancyCount: number
  discrepancyGroups: DiscrepancyGroup[]
}

interface DiscrepancyPanelProps {
  discrepancies: DiscrepancyData[]
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

export function DiscrepancyPanel({ discrepancies, dateRange }: DiscrepancyPanelProps) {
  const navigate = useNavigate()

  if (!discrepancies || discrepancies.length === 0) {
    return null
  }

  const renderDiscrepancyGroupRow = (group: DiscrepancyGroup, side: 'primary' | 'secondary') => {
    const hours = side === 'primary' ? group.primary_hours : group.secondary_hours
    const deltaValue = group.delta_hours
    const isPositive = deltaValue > 0

    // Excluded groups (expected discrepancies) are shown in green
    const badgeVariant = group.is_excluded
      ? 'success'
      : (Math.abs(deltaValue) > 10 ? 'error' : 'warning')

    return (
      <tr key={group.initiative_key} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
        <td className="py-2 px-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-primary">{group.initiative_key}</span>
              {group.is_excluded && (
                <Badge variant="success" className="text-xs">OK</Badge>
              )}
            </div>
            {group.initiative_name && group.initiative_name !== group.initiative_key && (
              <p className="text-xs text-tertiary mt-0.5">{group.initiative_name}</p>
            )}
          </div>
        </td>
        <td className="py-2 px-3">
          <span className="text-xs font-mono text-primary">{formatHours(hours)}</span>
        </td>
        <td className="py-2 px-3 text-right">
          <Badge variant={badgeVariant} className="text-xs">
            {isPositive ? '+' : ''}{formatHours(Math.abs(deltaValue))}
          </Badge>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      {discrepancies.map((disc) => {
        const severity = disc.discrepancyCount >= 10 ? 'error' : 'warning'
        const borderColor = severity === 'error' ? 'border-l-error' : 'border-l-warning'
        const bgColor = severity === 'error' ? 'bg-error-subtle' : 'bg-warning-subtle'

        // Separate groups by which side has more hours
        const primaryGroups = disc.discrepancyGroups.filter(g => g.primary_hours > g.secondary_hours)
        const secondaryGroups = disc.discrepancyGroups.filter(g => g.secondary_hours > g.primary_hours)

        const primaryOnlyHours = primaryGroups.reduce((sum, g) => sum + Math.abs(g.delta_hours), 0)
        const secondaryOnlyHours = secondaryGroups.reduce((sum, g) => sum + Math.abs(g.delta_hours), 0)

        return (
          <Card key={disc.groupName} className={`border-l-4 ${borderColor} ${bgColor}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`w-5 h-5 ${severity === 'error' ? 'text-error' : 'text-warning'}`}
                />
                <div>
                  <h3 className="text-sm font-semibold text-primary">{disc.groupName}</h3>
                  <p className="text-xs text-secondary">
                    {disc.discrepancyCount} discrepanc{disc.discrepancyCount === 1 ? 'y' : 'ies'} found
                  </p>
                </div>
              </div>
              <Badge variant={severity}>
                Delta: {disc.delta > 0 ? '+' : ''}
                {formatHours(disc.delta)}
              </Badge>
            </div>

            {/* Two-column comparison - Aggregated Groups */}
            <div className="grid grid-cols-2 gap-4">
              {/* Primary instance higher */}
              <div className="border border-border rounded-lg bg-surface p-3">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-tertiary">
                      Higher in {disc.primaryInstance}{' '}
                      <span className="text-accent font-medium">(primary)</span>
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-mono font-semibold text-primary">
                      {primaryGroups.length} group{primaryGroups.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-tertiary">(+{formatHours(primaryOnlyHours)})</span>
                  </div>
                </div>

                {primaryGroups.length > 0 ? (
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full text-left">
                      <thead className="bg-surface-secondary">
                        <tr>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Group</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Hours</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary text-right">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface">
                        {primaryGroups.slice(0, 10).map(group => renderDiscrepancyGroupRow(group, 'primary'))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-tertiary italic py-2">No excess hours</p>
                )}
              </div>

              {/* Secondary instance higher */}
              <div className="border border-border rounded-lg bg-surface p-3">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-tertiary">Higher in {disc.secondaryInstance}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-mono font-semibold text-primary">
                      {secondaryGroups.length} group{secondaryGroups.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-tertiary">(+{formatHours(secondaryOnlyHours)})</span>
                  </div>
                </div>

                {secondaryGroups.length > 0 ? (
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full text-left">
                      <thead className="bg-surface-secondary">
                        <tr>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Group</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Hours</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary text-right">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface">
                        {secondaryGroups.slice(0, 10).map(group => renderDiscrepancyGroupRow(group, 'secondary'))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-tertiary italic py-2">No excess hours</p>
                )}
              </div>
            </div>

            {/* View all link */}
            {disc.discrepancyCount > 20 && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const startDate = format(dateRange.startDate, 'yyyy-MM-dd')
                    const endDate = format(dateRange.endDate, 'yyyy-MM-dd')
                    navigate(`/app/worklogs?start_date=${startDate}&end_date=${endDate}`)
                  }}
                  className="text-xs"
                >
                  View all {disc.discrepancyCount} groups in Worklogs
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
