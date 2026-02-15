import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface MultiSelectProps {
  label: string
  options: string[]
  value: string[]  // Array of selected values
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      // Remove option
      onChange(value.filter(v => v !== option))
    } else {
      // Add option
      onChange([...value, option])
    }
  }

  const displayText = value.length > 0
    ? value.join(', ')
    : placeholder

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      <label className="block text-xs font-medium text-secondary mb-1.5">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 text-sm bg-surface border border-border rounded-md
                   focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                   flex items-center justify-between text-left"
      >
        <span className={value.length > 0 ? 'text-primary' : 'text-tertiary'}>
          {displayText}
        </span>
        <ChevronDown className={`w-4 h-4 text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {options.map((option) => {
            const isSelected = value.includes(option)
            return (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOption(option)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-accent border-accent'
                    : 'border-border bg-surface'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-primary">{option}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* Helper text */}
      {value.length > 0 && (
        <p className="mt-1 text-xs text-tertiary">
          {value.length} {value.length === 1 ? 'tipo selezionato' : 'tipi selezionati'}
        </p>
      )}
    </div>
  )
}
