export default function KillerFeatureCard({ icon, badge, title, description, benefitLine, color = 'blue' }) {
    const colorMap = {
        blue: { border: 'border-l-accent-blue', badge: 'bg-accent-blue/20 text-accent-blue', icon: 'text-accent-blue bg-accent-blue/10' },
        orange: { border: 'border-l-accent-orange', badge: 'bg-accent-orange/20 text-accent-orange', icon: 'text-accent-orange bg-accent-orange/10' },
        green: { border: 'border-l-accent-green', badge: 'bg-accent-green/20 text-accent-green', icon: 'text-accent-green bg-accent-green/10' },
    }
    const c = colorMap[color] || colorMap.blue

    return (
        <div className={`glass-card p-8 border-l-4 ${c.border} hover:shadow-glow transition-all duration-300`}>
            {badge && (
                <span className={`inline-block px-3 py-1 text-xxs font-semibold rounded-full ${c.badge} uppercase tracking-wider mb-4`}>
                    {badge}
                </span>
            )}

            <div className={`w-14 h-14 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                {icon}
            </div>

            <h3 className="text-xl font-bold text-dark-100 mb-3">{title}</h3>

            <p className="text-dark-300 text-sm leading-relaxed mb-4">{description}</p>

            <p className="text-dark-200 text-sm font-medium italic border-t border-dark-700 pt-4">
                {benefitLine}
            </p>
        </div>
    )
}
