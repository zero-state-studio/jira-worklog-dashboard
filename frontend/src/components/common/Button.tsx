import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

/**
 * Button Component
 *
 * Design System Button with variants, sizes, and loading state.
 * Uses ONLY design tokens from design-tokens.css.
 *
 * @example
 * <Button variant="primary" size="md">Save</Button>
 * <Button variant="secondary" icon={<Icon />}>Cancel</Button>
 * <Button variant="danger" loading>Delete</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  // Base styles - consistent across all variants
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  // Size variants
  const sizeStyles = {
    sm: 'h-button-sm px-3 text-sm', // 28px height, 13px text
    md: 'h-button-md px-4 text-sm', // 32px height, 13px text
    lg: 'h-button-lg px-5 text-base', // 36px height, 14px text
  }

  // Variant styles
  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover rounded-md',
    secondary: 'bg-surface text-primary border border-solid hover:bg-surface-hover hover:border-strong rounded-md',
    ghost: 'bg-transparent text-secondary hover:bg-surface-hover rounded-md',
    danger: 'bg-error text-white hover:bg-error hover:opacity-90 rounded-md',
  }

  // Loading spinner
  const Spinner = () => (
    <svg
      className="animate-spin h-[14px] w-[14px]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}
