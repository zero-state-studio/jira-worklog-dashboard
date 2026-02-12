import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

/**
 * Input Component
 *
 * Standard text input with label, error, and helper text.
 * Height: 36px. Font: 14px. NO floating label, NO animations.
 *
 * @example
 * <Input label="Email" placeholder="you@example.com" />
 * <Input label="Name" error="Required field" />
 * <Input label="Username" helper="Lowercase only" />
 */
export function Input({ label, error, helper, className = '', ...props }: InputProps) {
  const inputId = React.useId()

  // Base input styles
  const baseStyles =
    'w-full h-input px-3 bg-surface border border-solid rounded-md text-primary text-base transition-colors placeholder:text-tertiary'

  // State styles
  const stateStyles = error
    ? 'border-error focus:outline-none focus:ring-2 focus:ring-error'
    : 'border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'

  // Disabled styles
  const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-secondary mb-1"
        >
          {label}
        </label>
      )}

      {/* Input */}
      <input
        id={inputId}
        className={`${baseStyles} ${stateStyles} ${disabledStyles} ${className}`}
        {...props}
      />

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-error" role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && helper && <p className="mt-1 text-xs text-tertiary">{helper}</p>}
    </div>
  )
}
