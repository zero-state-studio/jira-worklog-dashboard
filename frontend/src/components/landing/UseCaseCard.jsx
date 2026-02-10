export default function UseCaseCard({ persona, personaDetail, scenarioBefore, scenarioAfter, result, accentColor = 'blue' }) {
    const colorMap = {
        blue: { border: 'border-l-accent-blue', bg: 'bg-accent-blue/10', text: 'text-accent-blue' },
        green: { border: 'border-l-accent-green', bg: 'bg-accent-green/10', text: 'text-accent-green' },
        orange: { border: 'border-l-accent-orange', bg: 'bg-accent-orange/10', text: 'text-accent-orange' },
        pink: { border: 'border-l-accent-pink', bg: 'bg-accent-pink/10', text: 'text-accent-pink' },
    }
    const colors = colorMap[accentColor] || colorMap.blue

    return (
        <div className="glass-card overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                        <span className={`text-sm font-bold ${colors.text}`}>
                            {persona.charAt(0)}
                        </span>
                    </div>
                    <div>
                        <h4 className="text-dark-100 font-semibold text-sm">{persona}</h4>
                        <p className="text-dark-500 text-xs">{personaDetail}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <span className="text-xxs font-semibold uppercase tracking-wider text-accent-red/80 mb-1 block">Prima</span>
                    <blockquote className="text-dark-300 text-sm leading-relaxed pl-4 border-l-2 border-dark-600 italic">
                        &ldquo;{scenarioBefore}&rdquo;
                    </blockquote>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-dark-700" />
                    <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <div className="flex-1 h-px bg-dark-700" />
                </div>

                <div>
                    <span className="text-xxs font-semibold uppercase tracking-wider text-accent-green/80 mb-1 block">Dopo</span>
                    <blockquote className={`text-dark-200 text-sm leading-relaxed pl-4 ${colors.border} border-l-2`}>
                        &ldquo;{scenarioAfter}&rdquo;
                    </blockquote>
                </div>
            </div>

            <div className={`px-6 py-4 ${colors.bg} border-t border-dark-700`}>
                <div className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${colors.text} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-sm font-semibold ${colors.text}`}>{result}</span>
                </div>
            </div>
        </div>
    )
}
