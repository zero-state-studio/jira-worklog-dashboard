import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../../styles/datepicker.css'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function DateRangePicker({ startDate, endDate, onChange, isActive = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState(startDate)
  const [tempEndDate, setTempEndDate] = useState(endDate)
  const popoverRef = useRef(null)

  // Update temp dates when props change
  useEffect(() => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
  }, [startDate, endDate])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Quick preset handlers
  const handleQuickRange = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setTempStartDate(start)
    setTempEndDate(end)
  }

  const handleApply = () => {
    if (onChange && tempStartDate && tempEndDate) {
      onChange({ startDate: tempStartDate, endDate: tempEndDate })
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setIsOpen(false)
  }

  // Format button label
  const formatButtonLabel = () => {
    if (!startDate || !endDate) return 'Custom Range'

    const start = format(startDate, 'MMM d')
    const end = format(endDate, 'MMM d, yyyy')

    // If same month and year, show "Jan 1 - 15, 2024"
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${start} - ${format(endDate, 'd, yyyy')}`
    }

    // If different months, show "Jan 1 - Feb 15, 2024"
    return `${start} - ${end}`
  }

  // Show custom range if isActive prop is true
  const isCustomRange = isActive && startDate && endDate

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[28px] px-3 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
          isCustomRange
            ? 'bg-accent-subtle text-accent-text'
            : 'bg-transparent text-secondary hover:bg-surface-hover'
        }`}
      >
        <Calendar size={14} />
        {isCustomRange ? formatButtonLabel() : 'Custom Range'}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-solid rounded-lg shadow-lg p-4 w-[320px]">
          {/* Quick Presets */}
          <div className="mb-3 pb-3 border-b border-solid">
            <p className="text-xs text-tertiary mb-2">Quick Select</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickRange(7)}
                className="px-2 py-1 text-xs text-secondary hover:bg-surface-hover rounded transition-colors"
              >
                Last 7 days
              </button>
              <button
                onClick={() => handleQuickRange(14)}
                className="px-2 py-1 text-xs text-secondary hover:bg-surface-hover rounded transition-colors"
              >
                Last 14 days
              </button>
              <button
                onClick={() => handleQuickRange(30)}
                className="px-2 py-1 text-xs text-secondary hover:bg-surface-hover rounded transition-colors"
              >
                Last 30 days
              </button>
              <button
                onClick={() => handleQuickRange(90)}
                className="px-2 py-1 text-xs text-secondary hover:bg-surface-hover rounded transition-colors"
              >
                Last 90 days
              </button>
            </div>
          </div>

          {/* Single Calendar with Range Selection */}
          <DatePicker
            selected={tempStartDate}
            onChange={(dates) => {
              const [start, end] = dates
              setTempStartDate(start)
              setTempEndDate(end)
            }}
            startDate={tempStartDate}
            endDate={tempEndDate}
            selectsRange
            maxDate={new Date()}
            inline
          />

          {/* Actions */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-solid">
            <div className="text-xs text-tertiary">
              {tempStartDate && tempEndDate && (
                <span>
                  {format(tempStartDate, 'MMM d')} - {format(tempEndDate, 'MMM d, yyyy')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-hover rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!tempStartDate || !tempEndDate}
                className="px-3 py-1.5 text-xs font-medium bg-accent text-inverse rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
