export default function StepCard({ number, title, description, detail, icon }) {
    return (
        <div className="text-center relative">
            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-accent flex items-center justify-center  relative">
                <span className="text-white text-xl font-bold">{number}</span>
            </div>

            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-dark-700 flex items-center justify-center text-dark-200">
                {icon}
            </div>

            <h3 className="text-xl font-bold text-dark-100 mb-3">
                {title}
            </h3>
            <p className="text-dark-300 text-sm leading-relaxed mb-3 max-w-xs mx-auto">
                {description}
            </p>
            {detail && (
                <span className="text-xxs font-medium text-accent-green bg-accent-green/10 px-3 py-1 rounded-full">
                    {detail}
                </span>
            )}
        </div>
    )
}
