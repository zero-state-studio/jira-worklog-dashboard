import TestimonialCard from './TestimonialCard'
import StatCounter from './StatCounter'

export default function TestimonialsSection() {
    const testimonials = [
        {
            quote: "Finalmente ho una visione unificata su tutti i nostri team e istanze JIRA. Le decisioni che prima richiedevano ore di raccolta dati ora le prendo in 30 secondi.",
            author: "Marco R.",
            role: "CTO",
            detail: "5 team, 40+ sviluppatori",
            rating: 5,
            accentColor: "blue"
        },
        {
            quote: "Ho eliminato completamente i report manuali del venerdi. La dashboard mi da tutto quello che mi serve in tempo reale. Il mio management è più contento, e io ho 4 ore in più a settimana.",
            author: "Sara M.",
            role: "Project Manager",
            detail: "2 team, 15 membri",
            rating: 5,
            accentColor: "green"
        },
        {
            quote: "Il billing integrato ha cambiato tutto. Prima facevo errori di fatturazione almeno una volta al mese. Ora le fatture sono perfette al primo colpo, e ci metto un decimo del tempo.",
            author: "Andrea B.",
            role: "Finance Director",
            detail: "8 clienti attivi",
            rating: 5,
            accentColor: "orange"
        }
    ]

    const stats = [
        { value: 16, suffix: "h/mese", label: "Tempo risparmiato" },
        { value: 95, suffix: "%", label: "Meno errori fatturazione", prefix: "-" },
        { value: 5, suffix: " min", label: "Tempo di setup" },
        { value: 4.9, suffix: "/5", label: "Soddisfazione", decimals: 1 },
    ]

    return (
        <section className="section-padding gradient-section-bg">
            <div className="container mx-auto max-w-7xl">
                <div className="section-header">
                    <h2 className="section-title">Cosa dicono i team che lo usano</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {testimonials.map((testimonial, i) => (
                        <TestimonialCard key={i} {...testimonial} />
                    ))}
                </div>

                <div className="glass-card p-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <StatCounter key={i} {...stat} duration={2500} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
