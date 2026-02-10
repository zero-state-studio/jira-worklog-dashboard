export default function TestimonialCard({ quote, author, role, detail, rating = 5, accentColor = 'blue' }) {
    const colorMap = {
        blue: 'bg-accent-blue/10 text-accent-blue',
        green: 'bg-accent-green/10 text-accent-green',
        orange: 'bg-accent-orange/10 text-accent-orange',
    }

    return (
        <div className="glass-card p-6 flex flex-col h-full">
            <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-accent-orange' : 'text-dark-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>

            <blockquote className="text-dark-200 text-base leading-relaxed flex-1 mb-6">
                &ldquo;{quote}&rdquo;
            </blockquote>

            <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
                <div className={`w-10 h-10 rounded-full ${colorMap[accentColor] || colorMap.blue} flex items-center justify-center font-bold text-sm`}>
                    {author.charAt(0)}
                </div>
                <div>
                    <p className="text-dark-100 font-semibold text-sm">{author}</p>
                    <p className="text-dark-400 text-xs">{role}</p>
                    {detail && <p className="text-dark-500 text-xxs">{detail}</p>}
                </div>
            </div>
        </div>
    )
}
