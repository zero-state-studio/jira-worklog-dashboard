import React, { useState, useEffect } from 'react'
import { Card, Badge } from '../common'
import { Settings, CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { getMatchingAlgorithms, updateMatchingAlgorithm } from '../../api/client'

interface MatchingAlgorithm {
  id: number
  algorithm_type: string
  algorithm_name: string
  description: string
  enabled: boolean
  config: Record<string, any>
  priority: number
}

export function MatchingAlgorithmsSettings() {
  const [algorithms, setAlgorithms] = useState<MatchingAlgorithm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchAlgorithms()
  }, [])

  const fetchAlgorithms = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getMatchingAlgorithms()
      setAlgorithms(response.algorithms || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load matching algorithms')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (algorithm: MatchingAlgorithm) => {
    try {
      setUpdating(algorithm.algorithm_type)
      await updateMatchingAlgorithm(
        algorithm.algorithm_type,
        !algorithm.enabled,
        algorithm.config,
        algorithm.priority
      )

      // Update local state
      setAlgorithms((prev) =>
        prev.map((a) =>
          a.algorithm_type === algorithm.algorithm_type
            ? { ...a, enabled: !a.enabled }
            : a
        )
      )
    } catch (err: any) {
      setError(err.message || 'Failed to update algorithm')
    } finally {
      setUpdating(null)
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
            <h2 className="text-base font-semibold text-primary">Matching Algorithms</h2>
            <p className="text-xs text-tertiary">Loading...</p>
          </div>
        </div>
        <div className="h-24 bg-surface-secondary rounded animate-pulse" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-error-subtle flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Matching Algorithms</h2>
            <p className="text-xs text-error">{error}</p>
          </div>
        </div>
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
          <h2 className="text-base font-semibold text-primary">Matching Algorithms</h2>
          <p className="text-xs text-tertiary">
            Configure how worklogs are matched across complementary instances
          </p>
        </div>
      </div>

      {algorithms.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-tertiary">No matching algorithms available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {algorithms.map((algorithm) => (
            <div
              key={algorithm.algorithm_type}
              className="p-4 border border-border rounded-lg hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-primary">{algorithm.algorithm_name}</h3>
                    {algorithm.enabled ? (
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <Circle className="w-3 h-3" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">{algorithm.description}</p>

                  {algorithm.enabled && (
                    <div className="mt-2 p-2 bg-accent-subtle rounded text-xs text-accent-text">
                      <strong>Active:</strong> This algorithm is currently being used to calculate
                      discrepancies.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleToggle(algorithm)}
                  disabled={updating === algorithm.algorithm_type}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${algorithm.enabled ? 'bg-accent' : 'bg-border-strong'}
                  `}
                  aria-label={`Toggle ${algorithm.algorithm_name}`}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${algorithm.enabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-secondary leading-relaxed">
            <strong>Note:</strong> Enabling an algorithm will change how discrepancies are calculated
            in the Dashboard. Algorithms are applied in priority order (lower number = higher priority).
          </p>
        </div>
      </div>
    </Card>
  )
}
