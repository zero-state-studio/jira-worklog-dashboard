import { useNavigate } from 'react-router-dom'

export default function BillingShowcaseSection() {
    const navigate = useNavigate()

    const features = [
        "Rate personalizzate: Per utente, per progetto o per cliente",
        "Preview in-app: Vedi la fattura prima di esportarla",
        "Export Excel: Formato pronto per la contabilita, generato in 3 secondi",
        "Storico completo: Tutte le fatture archiviate e consultabili",
        "Classificazione ore: Fatturabili, non fatturabili, interne"
    ]

    return (
        <section className="section-padding bg-surface">
            <div className="container mx-auto max-w-7xl">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Billing mockup */}
                    <div className="glass-card p-4 shadow-lg">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-solid">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-accent-orange" />
                                <div className="w-3 h-3 rounded-full bg-accent-green" />
                            </div>
                            <div className="flex-1 bg-surface rounded px-3 py-1 text-xs text-tertiary">
                                billing
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-surface-hover rounded w-32" />
                                <div className="h-6 bg-accent-green/20 text-success text-xs px-2 py-1 rounded font-medium">Pronta</div>
                            </div>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-3 items-center">
                                    <div className="h-3 bg-surface rounded flex-1" />
                                    <div className="h-3 bg-surface rounded w-16" />
                                    <div className="h-3 bg-accent rounded w-12" />
                                </div>
                            ))}
                            <div className="flex justify-end pt-3 border-t border-solid">
                                <div className="h-5 bg-accent rounded w-24" />
                            </div>
                        </div>
                    </div>

                    {/* Right: Text content */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                            La fatturazione che i team JIRA aspettavano da anni
                        </h2>
                        <p className="text-secondary text-lg mb-6 leading-relaxed">
                            Il billing integrato è la nostra feature più richiesta.
                            È l'unica ragione per cui molti team smettono di usare fogli Excel per fatturare.
                        </p>

                        <ul className="space-y-3 mb-8">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-secondary text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="glass-card p-4 inline-flex items-center gap-3 mb-6">
                            <div className="text-2xl font-bold bg-accent bg-clip-text text-transparent">6h</div>
                            <p className="text-secondary text-sm">risparmiate al mese in media sulla fatturazione</p>
                        </div>

                        <div>
                            <button
                                onClick={() => navigate('/login')}
                                className="btn-primary text-lg px-8 py-3"
                            >
                                Prova il Billing Gratis
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
