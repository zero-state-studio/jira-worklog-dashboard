import React, { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label?: string
  error?: string
  helper?: string
  placeholder?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  searchable?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Select Component
 *
 * Custom select with search/filter support for long lists (>10 items).
 * Dropdown: shadow-md, max-height 240px, scroll.
 *
 * @example
 * <Select
 *   label="Team"
 *   options={teams}
 *   value={selectedTeam}
 *   onChange={setSelectedTeam}
 *   searchable
 * />
 */
export function Select({
  label,
  error,
  helper,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  searchable = false,
  disabled = false,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)
  const inputId = React.useId()

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Base styles
  const triggerBaseStyles =
    'w-full h-input px-3 bg-surface border border-solid rounded-md text-primary text-base transition-colors flex items-center justify-between cursor-pointer'

  // State styles
  const triggerStateStyles = error
    ? 'border-error focus:outline-none focus:ring-2 focus:ring-error'
    : 'border hover:border-strong focus:outline-none focus:ring-2 focus:ring-accent'

  // Disabled styles
  const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className={`w-full ${className}`} ref={selectRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-secondary mb-1"
        >
          {label}
        </label>
      )}

      {/* Select trigger */}
      <div className="relative">
        <button
          id={inputId}
          type="button"
          className={`${triggerBaseStyles} ${triggerStateStyles} ${disabled ? disabledStyles : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={selectedOption ? 'text-primary' : 'text-tertiary'}>
            {displayValue}
          </span>
          <svg
            className={`w-4 h-4 text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-solid rounded-md shadow-md max-h-[240px] overflow-auto">
            {/* Search input */}
            {searchable && options.length > 10 && (
              <div className="p-2 border-b border-solid sticky top-0 bg-surface">
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-solid rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Options */}
            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-tertiary">No results found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                      option.value === value ? 'bg-accent-subtle text-accent-text font-medium' : 'text-primary'
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

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
