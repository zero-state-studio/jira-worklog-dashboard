import UseCaseCard from './UseCaseCard'

export default function UseCasesSection() {
    const useCases = [
        {
            persona: "Sara M., Project Manager",
            personaDetail: "gestisce 2 team di sviluppo",
            scenarioBefore: "Ogni venerdi passavo 3-4 ore a raccogliere i worklog da JIRA, copiarli in Excel, calcolare le ore per membro e inviare il report al CTO. Se qualcuno non aveva loggato, dovevo rincorrerlo.",
            scenarioAfter: "Ora apro la dashboard e il report è già pronto. Vedo chi ha loggato e chi no in tempo reale. Il venerdi pomeriggio lo uso per lavorare, non per compilare tabelle.",
            result: "Da 4 ore di report a 0. Ogni settimana.",
            accentColor: "blue"
        },
        {
            persona: "Marco R., CTO",
            personaDetail: "5 team, 3 istanze JIRA Cloud",
            scenarioBefore: "Avevamo 3 istanze JIRA per ragioni storiche. Per avere una visione d'insieme dovevo accedere a ciascuna, esportare i dati, e aggregarli manualmente. Ci voleva mezza giornata.",
            scenarioAfter: "Ho connesso le 3 istanze in 10 minuti. Ora vedo tutti i team, tutti i progetti, tutte le ore in un'unica dashboard. La deduplicazione per le istanze complementari funziona in automatico.",
            result: "Visione unificata su 5 team e 40 sviluppatori.",
            accentColor: "green"
        },
        {
            persona: "Andrea B., Finance Director",
            personaDetail: "fatturazione mensile per 8 clienti",
            scenarioBefore: "Ogni fine mese era un incubo. Dovevo chiedere ai PM le ore per cliente, verificare i dati, calcolare le rate, preparare le fatture in Excel. Inevitabilmente c'erano errori.",
            scenarioAfter: "Seleziono il cliente, il periodo, e la fattura si genera da sola con le ore corrette. Preview, export Excel, invio. Per 8 clienti ci metto 20 minuti invece di 2 giorni.",
            result: "Fatturazione 8 clienti in 20 minuti. Zero errori.",
            accentColor: "orange"
        }
    ]

    return (
        <section className="section-padding bg-dark-900">
            <div className="container mx-auto max-w-7xl">
                <div className="section-header">
                    <h2 className="section-title">Come i team usano Worklog Dashboard ogni giorno</h2>
                    <p className="section-subtitle">
                        Tre scenari reali, tre problemi risolti. Scopri come team come il tuo
                        hanno trasformato il modo in cui gestiscono le ore.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {useCases.map((useCase, i) => (
                        <UseCaseCard key={i} {...useCase} />
                    ))}
                </div>
            </div>
        </section>
    )
}
