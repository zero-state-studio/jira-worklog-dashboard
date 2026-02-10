import PainPointCard from './PainPointCard'

export default function PainPointsSection() {
    const painPoints = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: "Passo 4 ore a settimana a compilare report dai worklog JIRA",
            description: "Copi dati da JIRA in un foglio Excel, li formatti, li invii al management. Ogni settimana. Da mesi. E se ti dicessimo che puoi riavere quelle 4 ore?",
            persona: "Sara, Project Manager"
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
            title: "Devo aprire 3 istanze JIRA per avere il quadro completo",
            description: "Un'istanza per il team frontend, una per il backend, una per il cliente. Tre login, tre dashboard, zero visione d'insieme. Suona familiare?",
            persona: "Marco, CTO"
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
            ),
            title: "Le fatture sono sempre in ritardo perche devo calcolare le ore a mano",
            description: "Chiedi i dati ai PM, aspetti, compili, verifichi, correggi. Ogni mese lo stesso incubo. E se le fatture si generassero da sole?",
            persona: "Andrea, Finance Director"
        }
    ]

    return (
        <section className="section-padding bg-dark-900">
            <div className="container mx-auto max-w-7xl">
                <div className="section-header">
                    <h2 className="section-title">Ti riconosci in queste situazioni?</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {painPoints.map((point, i) => (
                        <PainPointCard key={i} {...point} />
                    ))}
                </div>

                <p className="text-center text-dark-400 mt-12 text-lg italic">
                    Se hai annuito almeno una volta, sei nel posto giusto.
                </p>
            </div>
        </section>
    )
}
