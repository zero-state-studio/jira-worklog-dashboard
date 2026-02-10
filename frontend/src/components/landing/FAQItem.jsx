import { useState } from 'react'

export default function FAQItem({ question, answer, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border-b border-dark-700 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-5 px-1 text-left group"
                aria-expanded={isOpen}
            >
                <span className="text-dark-100 font-medium text-base pr-4 group-hover:text-primary-from transition-colors">
                    {question}
                </span>
                <svg
                    className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
                }`}
            >
                <p className="text-dark-300 text-sm leading-relaxed px-1">
                    {answer}
                </p>
            </div>
        </div>
    )
}
