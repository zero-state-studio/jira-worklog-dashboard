import React, { useEffect } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: ModalSize
  footer?: React.ReactNode
  children: React.ReactNode
}

/**
 * Modal Component
 *
 * Dialog overlay with header, body, and optional footer.
 * Overlay: bg black/50, backdrop-blur-sm.
 * Content: bg white, radius 12px (exception), shadow-lg.
 *
 * @example
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Confirm Action"
 *   footer={<Button onClick={handleConfirm}>Confirm</Button>}
 * >
 *   Are you sure?
 * </Modal>
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  // Size variants
  const sizeStyles = {
    sm: 'max-w-[400px]',
    md: 'max-w-[480px]',
    lg: 'max-w-[640px]',
  }

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className={`relative bg-surface rounded-xl shadow-lg w-full ${sizeStyles[size]} z-modal animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-solid">
          <h2 id="modal-title" className="text-lg font-semibold text-primary">
            {title}
          </h2>
          <button
            type="button"
            className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-surface-hover"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-y-auto max-h-[calc(100vh-200px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-solid">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
