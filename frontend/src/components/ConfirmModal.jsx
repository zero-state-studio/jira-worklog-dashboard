import { useEffect } from 'react'

/**
 * Reusable confirmation modal with danger styling.
 *
 * Props:
 * - isOpen: boolean - whether modal is visible
 * - onClose: () => void - close handler
 * - onConfirm: () => void - confirm handler
 * - title: string - modal title
 * - message: string - confirmation message
 * - confirmText: string - confirm button text (default: "Conferma")
 * - cancelText: string - cancel button text (default: "Annulla")
 * - isDanger: boolean - use danger styling (red) (default: false)
 * - disabled: boolean - disable confirm button (default: false)
 * - requireTypedConfirmation: string - require user to type this text to confirm (optional)
 */
export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Conferma",
    cancelText = "Annulla",
    isDanger = false,
    disabled = false,
    requireTypedConfirmation = null,
    children
}) {
    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    useEffect(() => {
        // Close modal on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="glass-card max-w-md w-full p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Title */}
                <h2 className={`text-xl font-bold ${isDanger ? 'text-accent-red' : 'text-dark-100'}`}>
                    {title}
                </h2>

                {/* Message */}
                <p className="text-dark-300 text-sm leading-relaxed">
                    {message}
                </p>

                {/* Custom content */}
                {children}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-dark-200 hover:bg-dark-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={disabled}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                            isDanger
                                ? 'bg-accent-red text-white hover:bg-accent-red/90'
                                : 'bg-accent text-white hover:opacity-90'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
