import React from 'react'

export type CardPadding = 'compact' | 'normal'

export interface CardProps {
  padding?: CardPadding
  hover?: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

/**
 * Card Component
 *
 * Flat card with minimal styling. NO shadow by default.
 * Optional hover effect with subtle shadow.
 *
 * @example
 * <Card padding="normal">Content</Card>
 * <Card padding="compact" hover onClick={handleClick}>Clickable</Card>
 */
export function Card({
  padding = 'normal',
  hover = false,
  children,
  className = '',
  onClick,
}: CardProps) {
  // Base styles
  const baseStyles = 'bg-surface border border-solid rounded-lg'

  // Padding variants
  const paddingStyles = {
    compact: 'p-3', // 12px
    normal: 'p-4', // 16px
  }

  // Hover styles
  const hoverStyles = hover
    ? 'transition-shadow duration-200 hover:shadow-sm cursor-pointer'
    : ''

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
