export default function PricingCard({
    name, price, currency, period, priceSubtitle, description,
    features, ctaText, ctaNote, highlighted = false, badge, onCtaClick
}) {
    return (
        <div className={`
            rounded-lg p-8 relative flex flex-col h-full
            ${highlighted
                ? 'bg-surface border-2 border-primary-from/50 '
                : 'glass-card'
            }
        `}>
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-xs font-semibold rounded-full bg-accent text-white ">
                        {badge}
                    </span>
                </div>
            )}

            <h3 className="text-lg font-semibold text-secondary mb-4">{name}</h3>

            <div className="mb-4">
                {price === 'Gratis' || price === 'Custom' ? (
                    <div className="text-4xl font-bold text-primary">{price}</div>
                ) : (
                    <div className="flex items-baseline gap-1">
                        {currency && <span className="text-tertiary text-lg">{currency}</span>}
                        <span className="text-5xl font-bold bg-accent bg-clip-text text-transparent">{price}</span>
                        {period && <span className="text-tertiary text-base">{period}</span>}
                    </div>
                )}
                {priceSubtitle && (
                    <p className="text-tertiary text-sm mt-1">{priceSubtitle}</p>
                )}
            </div>

            <p className="text-tertiary text-sm mb-6">{description}</p>

            <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-sm ${feature.startsWith('**') ? 'text-primary font-medium' : 'text-secondary'}`}>
                            {feature.replace(/\*\*/g, '')}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onCtaClick}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    highlighted
                        ? 'btn-primary text-center'
                        : 'btn-secondary text-center'
                }`}
            >
                {ctaText}
            </button>
            {ctaNote && (
                <p className="text-tertiary text-xs text-center mt-2">{ctaNote}</p>
            )}
        </div>
    )
}
