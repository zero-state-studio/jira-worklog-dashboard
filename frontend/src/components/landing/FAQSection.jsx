import FAQItem from './FAQItem'

export default function FAQSection() {
    const faqs = [
        {
            question: "È davvero gratis? Qual è il catch?",
            answer: "Nessun catch. Il piano Free è gratuito per sempre e include tutto il necessario per un singolo team con una istanza JIRA. Non chiediamo carta di credito, non ci sono costi nascosti, non limitiamo le funzionalità nel tempo. Il piano Pro a 29 EUR/mese (flat, non per utente) è per chi ha bisogno di più istanze, billing automatico e integrazioni avanzate."
        },
        {
            question: "I miei dati JIRA sono al sicuro?",
            answer: "Assolutamente. Utilizziamo un'architettura multi-tenant con isolamento completo dei dati: ogni azienda ha il proprio spazio separato, invisibile agli altri. L'autenticazione avviene tramite Google OAuth (nessuna password salvata da noi), e tutte le connessioni sono crittografate."
        },
        {
            question: "Funziona con Tempo Timesheets?",
            answer: "Sì, abbiamo un'integrazione nativa con Tempo API v4. Se il tuo team usa Tempo per il time tracking, Worklog Dashboard sincronizza i dati direttamente da Tempo con date filtering avanzato e sync ottimizzata. Se non usi Tempo, funzioniamo anche con i worklog nativi di JIRA."
        },
        {
            question: "Posso collegare più istanze JIRA?",
            answer: "Sì, ed è una delle nostre funzionalità esclusive. Puoi collegare 2, 3 o 10 istanze JIRA Cloud e vederle tutte aggregate in un'unica dashboard. Supportiamo anche le 'istanze complementari' - le ore vengono deduplicate automaticamente nella vista aggregata."
        },
        {
            question: "Quanto tempo serve per il setup?",
            answer: "5 minuti, in media. Il processo è: 1) Login con Google, 2) Inserisci URL e API token della tua istanza JIRA, 3) Avvia la prima sincronizzazione. Nessun software da installare, nessun consulente da chiamare."
        },
        {
            question: "Posso esportare i dati?",
            answer: "Sì, tutti i dati sono esportabili in formato Excel. Il billing module genera fatture in formato Excel pronto per la contabilità. Non facciamo lock-in: i tuoi dati sono sempre accessibili e esportabili."
        },
        {
            question: "Come funziona la fatturazione automatica?",
            answer: "Il modulo billing ti permette di: 1) Impostare rate orarie per utente, progetto o cliente, 2) Selezionare un periodo temporale, 3) Generare una fattura con preview in-app, 4) Esportare in Excel. Le ore vengono calcolate direttamente dai worklog JIRA, zero errori di trascrizione."
        },
        {
            question: "Che succede se la mia azienda cresce?",
            answer: "Il piano Free supporta fino a 5 utenti. Se il tuo team cresce, puoi passare al piano Pro (29 EUR/mese flat) che non ha limiti su utenti, team o istanze JIRA. Il bello del pricing flat è che non devi preoccuparti del costo per ogni nuovo membro."
        }
    ]

    return (
        <section id="faq" className="section-padding bg-surface/30">
            <div className="container mx-auto max-w-3xl">
                <div className="section-header">
                    <h2 className="section-title">Domande frequenti</h2>
                    <p className="section-subtitle">
                        Tutto quello che devi sapere prima di iniziare.
                    </p>
                </div>

                <div className="glass-card px-6 md:px-8 divide-y divide-dark-700">
                    {faqs.map((faq, i) => (
                        <FAQItem
                            key={i}
                            question={faq.question}
                            answer={faq.answer}
                            defaultOpen={i === 0}
                        />
                    ))}
                </div>

                <p className="text-center text-tertiary text-sm mt-6">
                    Non trovi la tua domanda?{' '}
                    <button className="text-accent-blue hover:underline">Contattaci</button>
                </p>
            </div>
        </section>
    )
}
