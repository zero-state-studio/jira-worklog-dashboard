import PricingCard from './PricingCard'
import { useNavigate } from 'react-router-dom'

export default function PricingSection() {
    const navigate = useNavigate()

    const plans = [
        {
            name: "Free",
            price: "Gratis",
            priceSubtitle: "per sempre",
            description: "Perfetto per iniziare. Tutto il necessario per un team con una singola istanza JIRA.",
            features: [
                "1 istanza JIRA Cloud",
                "1 team",
                "Fino a 5 utenti",
                "Dashboard real-time",
                "Analytics base (team, utenti)",
                "Sync automatica",
                "Google OAuth"
            ],
            ctaText: "Inizia Gratis",
            ctaNote: "Nessuna carta di credito richiesta",
            highlighted: false,
            onCtaClick: () => navigate('/login')
        },
        {
            name: "Pro",
            price: "29",
            currency: "EUR",
            period: "/mese",
            priceSubtitle: "tariffa flat, non per utente",
            badge: "Consigliato",
            description: "Per team in crescita che vogliono il massimo. Tutto illimitato, billing incluso.",
            features: [
                "**Tutto del piano Free, più:**",
                "Istanze JIRA illimitate",
                "Team illimitati",
                "Utenti illimitati",
                "Billing e fatturazione automatica",
                "Analytics avanzate (Epic, Issue, trend)",
                "Integrazione Factorial HR",
                "Istanze complementari",
                "Export Excel avanzati",
                "Supporto prioritario"
            ],
            ctaText: "Prova Pro Gratis",
            ctaNote: "14 giorni di prova gratuita",
            highlighted: true,
            onCtaClick: () => navigate('/login')
        },
        {
            name: "Enterprise",
            price: "Custom",
            priceSubtitle: "contattaci per un preventivo",
            description: "Per grandi organizzazioni con esigenze specifiche di sicurezza, compliance e supporto.",
            features: [
                "**Tutto del piano Pro, più:**",
                "SSO / SAML",
                "SLA garantito",
                "Supporto dedicato",
                "Deploy on-premise disponibile",
                "Configurazione personalizzata",
                "Account manager dedicato"
            ],
            ctaText: "Contattaci",
            ctaNote: "Rispondiamo entro 24 ore",
            highlighted: false,
            onCtaClick: () => {}
        }
    ]

    return (
        <section id="pricing" className="section-padding bg-dark-900">
            <div className="container mx-auto max-w-5xl">
                <div className="section-header">
                    <h2 className="section-title">Un prezzo. Tutto il team. Zero sorprese.</h2>
                    <p className="section-subtitle">
                        Nessun costo per utente. Mai. Aggiungi tutti i membri che vuoi senza pensare al budget.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {plans.map((plan, i) => (
                        <PricingCard key={i} {...plan} />
                    ))}
                </div>

                <p className="text-center text-dark-400 text-sm">
                    <strong className="text-dark-200">Nessun costo per utente. Mai.</strong>{' '}
                    A differenza di Tempo ($8/utente/mese) o Clockify ($12/utente/mese),
                    il nostro pricing è flat. Che tu abbia 5 o 500 utenti, il prezzo non cambia.
                </p>

                <p className="text-center text-dark-500 text-xs mt-4">
                    Non soddisfatto? Cancella in qualsiasi momento, senza domande. I tuoi dati restano tuoi.
                </p>
            </div>
        </section>
    )
}
