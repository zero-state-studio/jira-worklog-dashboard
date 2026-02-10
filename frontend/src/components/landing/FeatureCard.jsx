export default function FeatureCard({ icon, title, description, color = 'blue' }) {
    const colorClasses = {
        blue: 'text-accent-blue bg-accent-blue/10',
        green: 'text-accent-green bg-accent-green/10',
        purple: 'text-accent-purple bg-accent-purple/10',
        orange: 'text-accent-orange bg-accent-orange/10',
        cyan: 'text-accent-cyan bg-accent-cyan/10',
        pink: 'text-accent-pink bg-accent-pink/10'
    }

    return (
        <div className="glass-card-hover p-6 animate-fade-in">
            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-dark-100 mb-2">
                {title}
            </h3>
            <p className="text-dark-300 leading-relaxed">
                {description}
            </p>
        </div>
    )
}
