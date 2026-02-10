import { useNavigate } from 'react-router-dom'

export default function HeroSection() {
    const navigate = useNavigate()

    const scrollToHowItWorks = () => {
        const element = document.getElementById('how-it-works')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-radial from-primary-from/10 via-transparent to-transparent opacity-50" />

            <div className="container mx-auto max-w-7xl relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Text Content */}
                    <div className="text-center lg:text-left animate-fade-in">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-dark-100 mb-6 leading-tight">
                            Smetti di Fare Report.
                            <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2">
                                Inizia a Decidere.
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-dark-300 mb-8 leading-relaxed">
                            Connetti le tue istanze JIRA, visualizza i worklog del team in tempo reale
                            e genera fatture con un click. Setup in 5 minuti, gratis per sempre.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button
                                onClick={() => navigate('/login')}
                                className="btn-primary text-lg px-8 py-4"
                            >
                                <span className="flex items-center gap-2">
                                    Inizia Gratis
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </span>
                            </button>
                            <button
                                onClick={scrollToHowItWorks}
                                className="btn-secondary text-lg px-8 py-4"
                            >
                                <span className="flex items-center gap-2">
                                    Scopri come funziona
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                        </div>

                        {/* Trust indicators */}
                        <div className="mt-12 flex flex-wrap gap-6 justify-center lg:justify-start text-dark-400 text-sm">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Setup in 5 minuti</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Nessuna carta di credito</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Gratis per sempre</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Hero Visual - hidden on mobile */}
                    <div className="relative animate-slide-in-right hidden lg:block">
                        {/* Dashboard mockup */}
                        <div className="relative glass-card p-4 shadow-2xl">
                            {/* Mock browser chrome */}
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-dark-600">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-accent-orange" />
                                    <div className="w-3 h-3 rounded-full bg-accent-green" />
                                </div>
                                <div className="flex-1 bg-dark-700 rounded px-3 py-1 text-xs text-dark-400">
                                    worklog-dashboard.app
                                </div>
                            </div>

                            {/* Mock dashboard content */}
                            <div className="space-y-4">
                                {/* Mock stats cards */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-dark-700 rounded-lg p-3">
                                        <div className="h-2 bg-gradient-primary rounded mb-2 w-12" />
                                        <div className="h-6 bg-dark-600 rounded mb-1" />
                                        <div className="h-2 bg-dark-600 rounded w-16" />
                                    </div>
                                    <div className="bg-dark-700 rounded-lg p-3">
                                        <div className="h-2 bg-accent-green rounded mb-2 w-12" />
                                        <div className="h-6 bg-dark-600 rounded mb-1" />
                                        <div className="h-2 bg-dark-600 rounded w-16" />
                                    </div>
                                    <div className="bg-dark-700 rounded-lg p-3">
                                        <div className="h-2 bg-accent-purple rounded mb-2 w-12" />
                                        <div className="h-6 bg-dark-600 rounded mb-1" />
                                        <div className="h-2 bg-dark-600 rounded w-16" />
                                    </div>
                                </div>

                                {/* Mock chart */}
                                <div className="bg-dark-700 rounded-lg p-4 h-40 flex items-end gap-2">
                                    {[60, 80, 45, 90, 70, 85, 95].map((height, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gradient-primary rounded-t"
                                            style={{ height: `${height}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Floating badge */}
                        <div className="absolute -top-6 -right-6 glass-card px-4 py-2 shadow-glow animate-pulse-slow">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-dark-200 font-medium">Sync in tempo reale</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll hint indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-hint">
                <svg className="w-6 h-6 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </section>
    )
}
