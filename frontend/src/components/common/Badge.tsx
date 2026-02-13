import React from 'react'

export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'error'

export interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

/**
 * Badge Component
 *
 * Minimal status indicator with dot + text.
 * NO background pill, NO heavy padding, NO rounded-full style.
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error">Failed</Badge>
 */
export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  // Variant color mappings
  const variantStyles = {
    default: {
      dot: 'bg-border-strong',
      text: 'text-secondary',
    },
    info: {
      dot: 'bg-accent',
      text: 'text-accent',
    },
    success: {
      dot: 'bg-success',
      text: 'text-success',
    },
    warning: {
      dot: 'bg-warning',
      text: 'text-warning',
    },
    error: {
      dot: 'bg-error',
      text: 'text-error',
    },
  }

  const styles = variantStyles[variant]

  return (
    <span className={`inline-flex items-center gap-[5px] ${className}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${styles.dot}`} />
      <span className={`text-xs font-medium ${styles.text}`}>{children}</span>
    </span>
  )
}
