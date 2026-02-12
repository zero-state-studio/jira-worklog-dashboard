import FeatureCard from './FeatureCard'
import KillerFeatureCard from './KillerFeatureCard'

export default function FeaturesSection() {
    const killerFeatures = [
        {
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ),
            badge: "Multi-JIRA",
            title: "Connetti tutte le tue istanze JIRA in un'unica vista",
            description: "2, 3 o 10 istanze JIRA Cloud? Le aggreghiamo tutte. Dashboard unificata con deduplicazione automatica per istanze complementari. Zero tab switching, visione completa.",
            benefitLine: "L'unico tool che aggrega istanze JIRA illimitate con deduplicazione automatica.",
            color: "blue"
        },
        {
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
            ),
            badge: "Billing",
            title: "Da worklog a fattura in 3 click",
            description: "Rate orarie per utente, progetto o cliente. Seleziona il periodo, preview in-app, export Excel. Le ore vengono calcolate direttamente dai worklog JIRA, zero errori di trascrizione.",
            benefitLine: "Elimina 2 giorni/mese di fatturazione manuale.",
            color: "orange"
        },
        {
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            badge: "HR Integration",
            title: "Integrazione Factorial HR per assenze e festivita",
            description: "Sincronizza automaticamente ferie, permessi e malattie da Factorial. Le ore attese si aggiornano da sole, i report riflettono la realta. Niente piu calcoli manuali.",
            benefitLine: "Ore attese sempre corrette. Automaticamente.",
            color: "green"
        }
    ]

    const standardFeatures = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            title: 'Dashboard Real-time',
            description: 'Visualizza ore lavorate, trend giornalieri e metriche team aggiornate in tempo reale con grafici interattivi.',
            color: 'cyan'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            title: 'Multi-team Tracking',
            description: 'Gestisci piu team contemporaneamente con visibilita granulare per membro e aggregazione automatica.',
            color: 'green'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
            title: 'Multi-tenant Sicuro',
            description: 'Isolamento dati per company, autenticazione Google OAuth, controllo accessi granulare e crittografia.',
            color: 'pink'
        }
    ]

    return (
        <section id="features" className="section-padding bg-surface/30">
            <div className="container mx-auto max-w-7xl">
                {/* Section Header */}
                <div className="section-header">
                    <h2 className="section-title">
                        Tutto cio che ti serve, niente che non ti serva
                    </h2>
                    <p className="section-subtitle">
                        Tre funzionalita killer che ci distinguono, piu tutto il necessario per gestire i worklog del tuo team.
                    </p>
                </div>

                {/* Killer Features */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {killerFeatures.map((feature, index) => (
                        <KillerFeatureCard key={index} {...feature} />
                    ))}
                </div>

                {/* Standard Features */}
                <div className="grid md:grid-cols-3 gap-6">
                    {standardFeatures.map((feature, index) => (
                        <FeatureCard
                            key={index}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                            color={feature.color}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
