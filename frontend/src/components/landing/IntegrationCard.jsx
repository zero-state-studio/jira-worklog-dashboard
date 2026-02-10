export default function IntegrationCard({ logo, name, description, detail, comingSoon = false }) {
    return (
        <div className="glass-card p-6 text-center relative group hover:border-dark-500/50 transition-all duration-300">
            {comingSoon && (
                <span className="absolute top-3 right-3 px-2 py-0.5 text-xxs font-semibold rounded-full bg-accent-orange/20 text-accent-orange uppercase tracking-wider">
                    Coming Soon
                </span>
            )}

            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-700 flex items-center justify-center group-hover:bg-dark-600 transition-colors duration-300">
                <div className="w-10 h-10 text-dark-200 group-hover:text-dark-100 transition-colors flex items-center justify-center">
                    {logo}
                </div>
            </div>

            <h3 className="text-lg font-semibold text-dark-100 mb-2">
                {name}
            </h3>
            <p className="text-dark-400 text-sm leading-relaxed mb-2">
                {description}
            </p>
            {detail && (
                <span className="inline-block text-xxs font-medium text-accent-blue bg-accent-blue/10 px-2 py-1 rounded-full">
                    {detail}
                </span>
            )}
        </div>
    )
}
