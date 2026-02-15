import React from 'react'

export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'outline'

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
      isOutline: false,
    },
    info: {
      dot: 'bg-accent',
      text: 'text-accent',
      isOutline: false,
    },
    success: {
      dot: 'bg-success',
      text: 'text-success',
      isOutline: false,
    },
    warning: {
      dot: 'bg-warning',
      text: 'text-warning',
      isOutline: false,
    },
    error: {
      dot: 'bg-error',
      text: 'text-error',
      isOutline: false,
    },
    outline: {
      dot: '',
      text: 'text-secondary',
      isOutline: true,
    },
  }

  const styles = variantStyles[variant]

  // Outline variant uses border instead of dot
  if (styles.isOutline) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border border-border rounded ${styles.text} ${className}`}>
        {children}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-[5px] ${className}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${styles.dot}`} />
      <span className={`text-xs font-medium ${styles.text}`}>{children}</span>
    </span>
  )
}
