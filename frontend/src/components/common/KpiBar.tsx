import React from 'react'

export interface KpiItem {
  label: string
  value: string | number
  trend?: number
  trendDirection?: 'up' | 'down'
}

export interface KpiBarProps {
  items: KpiItem[]
  className?: string
}

/**
 * KpiBar Component
 *
 * Horizontal bar with KPI items separated by borders.
 * NO separate cards, NO shadows, NO icons/emoji.
 *
 * @example
 * <KpiBar
 *   items={[
 *     { label: 'Total Hours', value: '42.5h', trend: 12, trendDirection: 'up' },
 *     { label: 'Active Users', value: 156 },
 *     { label: 'Completion', value: '87%', trend: -3, trendDirection: 'down' },
 *   ]}
 * />
 */
export function KpiBar({ items, className = '' }: KpiBarProps) {
  return (
    <div className={`flex bg-surface border border-solid rounded-md ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex-1 px-4 py-3 ${index !== items.length - 1 ? 'border-r border-solid' : ''}`}
        >
          {/* Label */}
          <div className="text-xs uppercase font-medium text-tertiary tracking-wide mb-1">
            {item.label}
          </div>

          {/* Value + Trend */}
          <div className="flex items-baseline gap-2">
            <div className="font-mono text-xl font-bold text-primary">
              {item.value}
            </div>

            {/* Trend indicator */}
            {item.trend !== undefined && item.trendDirection && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  item.trendDirection === 'up' ? 'text-success' : 'text-error'
                }`}
              >
                <svg
                  className={`w-3 h-3 ${item.trendDirection === 'down' ? 'rotate-180' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{Math.abs(item.trend)}%</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
