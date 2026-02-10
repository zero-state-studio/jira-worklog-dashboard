import { useNavigate } from 'react-router-dom'
import StepCard from './StepCard'

export default function HowItWorksSection() {
    const navigate = useNavigate()

    return (
        <section id="how-it-works" className="section-padding gradient-section-bg">
            <div className="container mx-auto max-w-5xl">
                <div className="section-header">
                    <h2 className="section-title">Operativo in 3 semplici step</h2>
                    <p className="section-subtitle">
                        Dal primo accesso alla tua dashboard personalizzata in meno di 5 minuti.
                        Nessuna configurazione complessa, nessun consulente necessario.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connector line between steps (desktop only) */}
                    <div className="hidden md:block absolute top-7 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary-from/30 via-primary-to/30 to-primary-from/30" />

                    <StepCard
                        number={1}
                        title="Connetti"
                        description="Collega le tue istanze JIRA Cloud con un click. Supporto nativo per Tempo Timesheets e Factorial HR. Autenticazione sicura con Google OAuth."
                        detail="5 minuti di setup"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        }
                    />
                    <StepCard
                        number={2}
                        title="Visualizza"
                        description="La dashboard si popola automaticamente con i worklog del tuo team. Analytics per membro, per team, per Epic. Tutto in tempo reale, zero configurazione."
                        detail="Aggiornamento automatico"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        }
                    />
                    <StepCard
                        number={3}
                        title="Fattura"
                        description="Genera fatture direttamente dai worklog con il billing integrato. Imposta le rate, seleziona il periodo, esporta in Excel. Tre click, fattura pronta."
                        detail="Export Excel in 3 secondi"
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                    />
                </div>

                <div className="text-center mt-12">
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
                </div>
            </div>
        </section>
    )
}
