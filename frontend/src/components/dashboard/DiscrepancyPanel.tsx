import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button } from '../common'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { formatHours } from '../../hooks/useData'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Worklog {
  id: string
  issue_key: string
  summary: string
  duration: number
  date: string
  jira_instance: string
}

interface DiscrepancyData {
  groupName: string
  primaryInstance: string
  secondaryInstance: string
  primaryHours: number
  secondaryHours: number
  delta: number
  discrepancyCount: number
  primaryOnlyWorklogs: Worklog[]
  secondaryOnlyWorklogs: Worklog[]
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

  const renderWorklogRow = (wl: Worklog) => (
    <tr key={wl.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
      <td className="py-2 px-3">
        <button
          onClick={() => navigate(`/app/issues/${wl.issue_key}`)}
          className="text-xs font-mono text-accent hover:text-accent-hover transition-colors"
        >
          {wl.issue_key}
        </button>
      </td>
      <td className="py-2 px-3">
        <span className="text-xs font-mono text-primary">{formatHours(wl.duration / 3600)}</span>
      </td>
      <td className="py-2 px-3">
        <span className="text-xs text-secondary">
          {format(new Date(wl.date), 'd MMM', { locale: it })}
        </span>
      </td>
    </tr>
  )

  return (
    <div className="space-y-4">
      {discrepancies.map((disc) => {
        const severity = disc.discrepancyCount >= 10 ? 'error' : 'warning'
        const borderColor = severity === 'error' ? 'border-l-error' : 'border-l-warning'
        const bgColor = severity === 'error' ? 'bg-error-subtle' : 'bg-warning-subtle'

        const primaryOnlyCount = disc.primaryOnlyWorklogs.length
        const secondaryOnlyCount = disc.secondaryOnlyWorklogs.length
        const primaryOnlyHours = disc.primaryOnlyWorklogs.reduce((sum, w) => sum + w.duration / 3600, 0)
        const secondaryOnlyHours = disc.secondaryOnlyWorklogs.reduce(
          (sum, w) => sum + w.duration / 3600,
          0
        )

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

            {/* Two-column comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Primary instance only */}
              <div className="border border-border rounded-lg bg-surface p-3">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-tertiary">
                      Only in {disc.primaryInstance}{' '}
                      <span className="text-accent font-medium">(primary)</span>
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-mono font-semibold text-primary">
                      {primaryOnlyCount} worklogs
                    </span>
                    <span className="text-xs text-tertiary">({formatHours(primaryOnlyHours)})</span>
                  </div>
                </div>

                {primaryOnlyCount > 0 ? (
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full text-left">
                      <thead className="bg-surface-secondary">
                        <tr>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Issue</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Hours</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface">
                        {disc.primaryOnlyWorklogs.slice(0, 5).map(renderWorklogRow)}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-tertiary italic py-2">No unique worklogs</p>
                )}
              </div>

              {/* Secondary instance only */}
              <div className="border border-border rounded-lg bg-surface p-3">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-tertiary">Only in {disc.secondaryInstance}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-mono font-semibold text-primary">
                      {secondaryOnlyCount} worklogs
                    </span>
                    <span className="text-xs text-tertiary">({formatHours(secondaryOnlyHours)})</span>
                  </div>
                </div>

                {secondaryOnlyCount > 0 ? (
                  <div className="overflow-hidden rounded border border-border">
                    <table className="w-full text-left">
                      <thead className="bg-surface-secondary">
                        <tr>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Issue</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Hours</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-secondary">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface">
                        {disc.secondaryOnlyWorklogs.slice(0, 5).map(renderWorklogRow)}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-tertiary italic py-2">No unique worklogs</p>
                )}
              </div>
            </div>

            {/* View all link */}
            {(primaryOnlyCount > 5 || secondaryOnlyCount > 5) && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    // Navigate to Worklogs page with date range filter
                    const startDate = format(dateRange.startDate, 'yyyy-MM-dd')
                    const endDate = format(dateRange.endDate, 'yyyy-MM-dd')
                    navigate(`/app/worklogs?start_date=${startDate}&end_date=${endDate}`)
                  }}
                  className="text-xs"
                >
                  View all in Worklogs
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
