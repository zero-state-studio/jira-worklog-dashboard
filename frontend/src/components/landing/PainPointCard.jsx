export default function PainPointCard({ icon, title, description, persona }) {
    return (
        <div className="glass-card p-6 relative group hover:border-accent-orange/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent-orange/10 flex items-center justify-center mb-4 text-accent-orange">
                {icon}
            </div>

            <h3 className="text-dark-100 font-semibold text-lg mb-3 leading-snug">
                &ldquo;{title}&rdquo;
            </h3>

            <p className="text-dark-400 text-sm leading-relaxed mb-4">
                {description}
            </p>

            <span className="text-xxs font-medium text-dark-500 uppercase tracking-wider">
                {persona}
            </span>
        </div>
    )
}
