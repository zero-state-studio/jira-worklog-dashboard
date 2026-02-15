import { useNavigate } from 'react-router-dom'

export default function FinalCTASection() {
    const navigate = useNavigate()

    return (
        <section className="py-20 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-from/20 via-dark-800 to-primary-to/20" />
            <div className="absolute inset-0 bg-gradient-radial from-primary-from/10 via-transparent to-transparent opacity-50" />

            <div className="container mx-auto max-w-3xl relative z-10 text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-6 leading-tight">
                    Pronto a smettere di perdere tempo con i report manuali?
                </h2>

                <p className="text-xl text-secondary mb-10 leading-relaxed max-w-2xl mx-auto">
                    Unisciti ai team che hanno già automatizzato il tracking delle ore e la fatturazione.
                    Setup in 5 minuti, gratis per sempre.
                </p>

                <button
                    onClick={() => navigate('/login')}
                    className="btn-primary text-lg px-10 py-4 shadow-lg"
                >
                    <span className="flex items-center gap-2">
                        Crea il Tuo Account Gratis
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </span>
                </button>

                <div className="mt-8 flex flex-wrap gap-6 justify-center text-tertiary text-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Setup in 5 minuti</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Nessuna carta di credito</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Cancella quando vuoi</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
