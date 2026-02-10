# Landing Page Design Specification

> Complete design specifications for all landing page sections and reusable components.
> Based on: `MARKETING_STRATEGY.md`, `UX_ANALYSIS.md`, `LANDING_COPY.md`.
> Design system: Tailwind CSS dark theme, glass-card pattern, gradient-primary (#667eea -> #764ba2).

---

## Table of Contents

1. [Design System Reference](#1-design-system-reference)
2. [Page Structure & Section Order](#2-page-structure--section-order)
3. [Reusable Components](#3-reusable-components)
4. [Section Specifications](#4-section-specifications)
5. [Animation & Interaction Specs](#5-animation--interaction-specs)
6. [Responsive Breakpoints](#6-responsive-breakpoints)
7. [New Tailwind Extensions Required](#7-new-tailwind-extensions-required)

---

## 1. Design System Reference

### Existing Tokens (from `tailwind.config.js` + `index.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `dark-900` | `#0d1117` | Page background |
| `dark-800` | `#161b22` | Card backgrounds, navbar |
| `dark-700` | `#21262d` | Borders, secondary bg |
| `dark-600` | `#30363d` | Subtle borders |
| `dark-500` | `#484f58` | Muted text |
| `dark-400` | `#6e7681` | Secondary text |
| `dark-300` | `#8b949e` | Body text |
| `dark-200` | `#c9d1d9` | Primary text |
| `dark-100` | `#f0f6fc` | Headings, emphasis |
| `accent-blue` | `#58a6ff` | Links, primary accent |
| `accent-green` | `#3fb950` | Success, positive |
| `accent-purple` | `#a371f7` | Secondary accent |
| `accent-orange` | `#d29922` | Warning, attention |
| `accent-red` | `#f85149` | Error, danger |
| `accent-pink` | `#db61a2` | Tertiary accent |
| `accent-cyan` | `#39c5cf` | Info, highlight |
| `gradient-primary` | `135deg, #667eea -> #764ba2` | CTAs, hero accent |
| `glass-card` | `bg-dark-800/80 backdrop-blur-xl border border-dark-600/50 rounded-xl` | Card base |
| `glass-card-hover` | glass-card + hover effects + shadow-glow | Interactive cards |
| `btn-primary` | gradient-primary + shadow-glow + hover:scale-105 | Primary buttons |
| `btn-secondary` | bg-dark-700 + border-dark-600 | Secondary buttons |
| `shadow-glow` | `0 0 20px rgba(102, 126, 234, 0.3)` | Primary glow |

### New Tokens to Add

```js
// Add to tailwind.config.js > theme > extend
animation: {
  'count-up': 'countUp 1s ease-out forwards',
  'accordion-open': 'accordionOpen 0.3s ease-out',
  'accordion-close': 'accordionClose 0.2s ease-in',
  'float': 'float 3s ease-in-out infinite',
  'scroll-hint': 'scrollHint 2s ease-in-out infinite',
},
keyframes: {
  countUp: {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  accordionOpen: {
    '0%': { maxHeight: '0', opacity: '0' },
    '100%': { maxHeight: '500px', opacity: '1' },
  },
  accordionClose: {
    '0%': { maxHeight: '500px', opacity: '1' },
    '100%': { maxHeight: '0', opacity: '0' },
  },
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  scrollHint: {
    '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
    '50%': { transform: 'translateY(8px)', opacity: '1' },
  },
}
```

### New CSS Utility Classes

```css
/* Add to index.css @layer components */

.section-padding {
  @apply py-20 lg:py-28 px-4;
}

.section-header {
  @apply text-center mb-16;
}

.section-title {
  @apply text-4xl md:text-5xl font-bold text-dark-100 mb-4;
}

.section-subtitle {
  @apply text-xl text-dark-300 max-w-2xl mx-auto leading-relaxed;
}

.gradient-section-bg {
  @apply relative overflow-hidden;
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
}

.killer-feature-card {
  @apply glass-card p-8 relative overflow-hidden;
  border-left: 3px solid;
}
```

---

## 2. Page Structure & Section Order

```
Landing.jsx
├── LandingNavbar          (sticky, existing - minor updates)
├── HeroSection            (existing - major updates)
├── SocialProofBar         (NEW - compact trust bar)
├── PainPointsSection      (NEW - 3 cards)
├── HowItWorksSection      (NEW - 3 steps)
├── FeaturesSection        (existing - restructure to killer + standard)
├── BillingShowcaseSection (NEW - split layout)
├── IntegrationsSection    (NEW - logo grid)
├── UseCasesSection        (NEW - scenario cards)
├── TestimonialsSection    (NEW - quotes + stats)
├── PricingSection         (NEW - 3 tiers)
├── FAQSection             (NEW - accordion)
├── FinalCTASection        (NEW - gradient CTA block)
└── LandingFooter          (existing - enhanced)
```

### Updated `Landing.jsx`

```jsx
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import SocialProofBar from '../components/landing/SocialProofBar'
import PainPointsSection from '../components/landing/PainPointsSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import BillingShowcaseSection from '../components/landing/BillingShowcaseSection'
import IntegrationsSection from '../components/landing/IntegrationsSection'
import UseCasesSection from '../components/landing/UseCasesSection'
import TestimonialsSection from '../components/landing/TestimonialsSection'
import PricingSection from '../components/landing/PricingSection'
import FAQSection from '../components/landing/FAQSection'
import FinalCTASection from '../components/landing/FinalCTASection'
import LandingFooter from '../components/landing/LandingFooter'

export default function Landing() {
    return (
        <div className="min-h-screen bg-dark-900">
            <LandingNavbar />
            <HeroSection />
            <SocialProofBar />
            <PainPointsSection />
            <HowItWorksSection />
            <FeaturesSection />
            <BillingShowcaseSection />
            <IntegrationsSection />
            <UseCasesSection />
            <TestimonialsSection />
            <PricingSection />
            <FAQSection />
            <FinalCTASection />
            <LandingFooter />
        </div>
    )
}
```

---

## 3. Reusable Components

### 3.1 StatCounter

**File**: `src/components/landing/StatCounter.jsx`
**Purpose**: Animated number counter with label, used in Social Proof and Testimonials.
**Dependencies**: `useCountUp` hook (already exists at `src/hooks/useCountUp.js`)

```jsx
import { useCountUp } from '../../hooks/useCountUp'
import { useRef, useState, useEffect } from 'react'

/**
 * @prop {number} value - Target number (e.g. 500, 1000000, 99.9)
 * @prop {string} suffix - Text after number (e.g. "+", "%", "h")
 * @prop {string} prefix - Text before number (e.g. "€")
 * @prop {string} label - Descriptive label below the number
 * @prop {number} decimals - Decimal places (default: 0)
 * @prop {ReactNode} icon - Optional icon element
 * @prop {number} duration - Animation duration ms (default: 2000)
 */
export default function StatCounter({ value, suffix = '', prefix = '', label, decimals = 0, icon, duration = 2000 }) {
    const ref = useRef(null)
    const [isVisible, setIsVisible] = useState(false)

    // IntersectionObserver to trigger animation on scroll into view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    const count = useCountUp(isVisible ? value : 0, duration, decimals, isVisible)

    return (
        <div ref={ref} className="text-center">
            {icon && (
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary-from/10 flex items-center justify-center text-primary-from">
                    {icon}
                </div>
            )}
            <div className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
                {prefix}{count}{suffix}
            </div>
            <p className="text-dark-400 text-sm mt-1 font-medium uppercase tracking-wider">
                {label}
            </p>
        </div>
    )
}
```

**Variants used**:
- Social Proof Bar: `<StatCounter value={500} suffix="+" label="Team attivi" />`
- Social Proof Bar: `<StatCounter value={1} suffix="M+" label="Worklog tracciati" />`
- Social Proof Bar: `<StatCounter value={99.9} suffix="%" decimals={1} label="Uptime garantito" />`
- Testimonials stats: `<StatCounter value={16} suffix="h/mese" label="Tempo risparmiato" />`

---

### 3.2 IntegrationCard

**File**: `src/components/landing/IntegrationCard.jsx`
**Purpose**: Logo card with name, description, and optional "Coming soon" badge.

```jsx
/**
 * @prop {ReactNode} logo - SVG logo or image element
 * @prop {string} name - Integration name (e.g. "Atlassian JIRA Cloud")
 * @prop {string} description - Short description
 * @prop {string} detail - Small detail text below description
 * @prop {boolean} comingSoon - Shows "Coming Soon" badge if true
 */
export default function IntegrationCard({ logo, name, description, detail, comingSoon = false }) {
    return (
        <div className="glass-card p-6 text-center relative group hover:border-dark-500/50 transition-all duration-300">
            {comingSoon && (
                <span className="absolute top-3 right-3 px-2 py-0.5 text-xxs font-semibold rounded-full bg-accent-orange/20 text-accent-orange uppercase tracking-wider">
                    Coming Soon
                </span>
            )}

            {/* Logo container */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-700 flex items-center justify-center group-hover:bg-dark-600 transition-colors duration-300">
                <div className="w-10 h-10 text-dark-200 group-hover:text-dark-100 transition-colors">
                    {logo}
                </div>
            </div>

            <h3 className="text-lg font-semibold text-dark-100 mb-2">
                {name}
            </h3>
            <p className="text-dark-400 text-sm leading-relaxed mb-2">
                {description}
            </p>
            {detail && (
                <span className="inline-block text-xxs font-medium text-accent-blue bg-accent-blue/10 px-2 py-1 rounded-full">
                    {detail}
                </span>
            )}
        </div>
    )
}
```

---

### 3.3 UseCaseCard

**File**: `src/components/landing/UseCaseCard.jsx`
**Purpose**: Scenario card with before/after, persona info, and measurable result.

```jsx
/**
 * @prop {string} persona - Persona name and role (e.g. "Sara, PM")
 * @prop {string} personaDetail - Additional detail (e.g. "gestisce 2 team di sviluppo")
 * @prop {string} scenarioBefore - Quote text for "before" state
 * @prop {string} scenarioAfter - Quote text for "after" state
 * @prop {string} result - Key measurable result (e.g. "Da 4 ore di report a 0")
 * @prop {string} accentColor - Tailwind accent color key (blue, green, orange, pink)
 */
export default function UseCaseCard({ persona, personaDetail, scenarioBefore, scenarioAfter, result, accentColor = 'blue' }) {
    const colorMap = {
        blue: { border: 'border-l-accent-blue', bg: 'bg-accent-blue/10', text: 'text-accent-blue' },
        green: { border: 'border-l-accent-green', bg: 'bg-accent-green/10', text: 'text-accent-green' },
        orange: { border: 'border-l-accent-orange', bg: 'bg-accent-orange/10', text: 'text-accent-orange' },
        pink: { border: 'border-l-accent-pink', bg: 'bg-accent-pink/10', text: 'text-accent-pink' },
    }
    const colors = colorMap[accentColor] || colorMap.blue

    return (
        <div className="glass-card overflow-hidden">
            {/* Persona header */}
            <div className="px-6 pt-6 pb-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                        <span className={`text-sm font-bold ${colors.text}`}>
                            {persona.charAt(0)}
                        </span>
                    </div>
                    <div>
                        <h4 className="text-dark-100 font-semibold text-sm">{persona}</h4>
                        <p className="text-dark-500 text-xs">{personaDetail}</p>
                    </div>
                </div>
            </div>

            {/* Before / After */}
            <div className="p-6 space-y-4">
                {/* Before */}
                <div>
                    <span className="text-xxs font-semibold uppercase tracking-wider text-accent-red/80 mb-1 block">Prima</span>
                    <blockquote className={`text-dark-300 text-sm leading-relaxed pl-4 border-l-2 border-dark-600 italic`}>
                        "{scenarioBefore}"
                    </blockquote>
                </div>

                {/* Arrow divider */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-dark-700" />
                    <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <div className="flex-1 h-px bg-dark-700" />
                </div>

                {/* After */}
                <div>
                    <span className="text-xxs font-semibold uppercase tracking-wider text-accent-green/80 mb-1 block">Dopo</span>
                    <blockquote className={`text-dark-200 text-sm leading-relaxed pl-4 ${colors.border} border-l-2`}>
                        "{scenarioAfter}"
                    </blockquote>
                </div>
            </div>

            {/* Result badge */}
            <div className={`px-6 py-4 ${colors.bg} border-t border-dark-700`}>
                <div className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${colors.text} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-sm font-semibold ${colors.text}`}>{result}</span>
                </div>
            </div>
        </div>
    )
}
```

---

### 3.4 TestimonialCard

**File**: `src/components/landing/TestimonialCard.jsx`
**Purpose**: Quote card with avatar, author info, and star rating.

```jsx
/**
 * @prop {string} quote - Testimonial text
 * @prop {string} author - Author name (e.g. "Marco R.")
 * @prop {string} role - Role and company (e.g. "CTO @ TechCorp")
 * @prop {string} detail - Additional context (e.g. "5 team, 40+ sviluppatori")
 * @prop {number} rating - Star rating 1-5
 * @prop {string} accentColor - Accent color for avatar bg
 */
export default function TestimonialCard({ quote, author, role, detail, rating = 5, accentColor = 'blue' }) {
    const colorMap = {
        blue: 'bg-accent-blue/10 text-accent-blue',
        green: 'bg-accent-green/10 text-accent-green',
        orange: 'bg-accent-orange/10 text-accent-orange',
    }

    return (
        <div className="glass-card p-6 flex flex-col h-full">
            {/* Stars */}
            <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-accent-orange' : 'text-dark-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>

            {/* Quote */}
            <blockquote className="text-dark-200 text-base leading-relaxed flex-1 mb-6">
                "{quote}"
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
                <div className={`w-10 h-10 rounded-full ${colorMap[accentColor] || colorMap.blue} flex items-center justify-center font-bold text-sm`}>
                    {author.charAt(0)}
                </div>
                <div>
                    <p className="text-dark-100 font-semibold text-sm">{author}</p>
                    <p className="text-dark-400 text-xs">{role}</p>
                    {detail && <p className="text-dark-500 text-xxs">{detail}</p>}
                </div>
            </div>
        </div>
    )
}
```

---

### 3.5 FAQItem

**File**: `src/components/landing/FAQItem.jsx`
**Purpose**: Expandable accordion item with smooth animation.

```jsx
import { useState } from 'react'

/**
 * @prop {string} question - The FAQ question
 * @prop {string} answer - The FAQ answer (supports long text)
 * @prop {boolean} defaultOpen - Whether item starts expanded (default: false)
 */
export default function FAQItem({ question, answer, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border-b border-dark-700 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-5 px-1 text-left group"
            >
                <span className="text-dark-100 font-medium text-base pr-4 group-hover:text-primary-from transition-colors">
                    {question}
                </span>
                <svg
                    className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
                }`}
            >
                <p className="text-dark-300 text-sm leading-relaxed px-1">
                    {answer}
                </p>
            </div>
        </div>
    )
}
```

---

### 3.6 PainPointCard

**File**: `src/components/landing/PainPointCard.jsx`
**Purpose**: Empathy card showing a relatable pain scenario.

```jsx
/**
 * @prop {ReactNode} icon - SVG icon element
 * @prop {string} title - Pain point quote (e.g. "Passo 4 ore a settimana...")
 * @prop {string} description - Expanded description
 * @prop {string} persona - Who experiences this (e.g. "Sara, Project Manager")
 */
export default function PainPointCard({ icon, title, description, persona }) {
    return (
        <div className="glass-card p-6 relative group hover:border-accent-orange/30 transition-all duration-300">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-accent-orange/10 flex items-center justify-center mb-4 text-accent-orange">
                {icon}
            </div>

            {/* Pain quote */}
            <h3 className="text-dark-100 font-semibold text-lg mb-3 leading-snug">
                "{title}"
            </h3>

            {/* Description */}
            <p className="text-dark-400 text-sm leading-relaxed mb-4">
                {description}
            </p>

            {/* Persona tag */}
            <span className="text-xxs font-medium text-dark-500 uppercase tracking-wider">
                {persona}
            </span>
        </div>
    )
}
```

---

### 3.7 StepCard

**File**: `src/components/landing/StepCard.jsx`
**Purpose**: Numbered step card for "How It Works" section.

```jsx
/**
 * @prop {number} number - Step number (1, 2, 3)
 * @prop {string} title - Step title (e.g. "Connetti")
 * @prop {string} description - Step description
 * @prop {string} detail - Small detail text (e.g. "5 minuti di setup")
 * @prop {ReactNode} icon - SVG icon
 */
export default function StepCard({ number, title, description, detail, icon }) {
    return (
        <div className="text-center relative">
            {/* Step number badge */}
            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow relative">
                <span className="text-white text-xl font-bold">{number}</span>
            </div>

            {/* Icon */}
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-dark-700 flex items-center justify-center text-dark-200">
                {icon}
            </div>

            <h3 className="text-xl font-bold text-dark-100 mb-3">
                {title}
            </h3>
            <p className="text-dark-300 text-sm leading-relaxed mb-3 max-w-xs mx-auto">
                {description}
            </p>
            {detail && (
                <span className="text-xxs font-medium text-accent-green bg-accent-green/10 px-3 py-1 rounded-full">
                    {detail}
                </span>
            )}
        </div>
    )
}
```

---

### 3.8 PricingCard

**File**: `src/components/landing/PricingCard.jsx`
**Purpose**: Pricing tier card with feature list and CTA.

```jsx
/**
 * @prop {string} name - Plan name ("Free", "Pro", "Enterprise")
 * @prop {string} price - Price display ("Gratis", "29", "Custom")
 * @prop {string} currency - Currency symbol (e.g. "EUR")
 * @prop {string} period - Billing period (e.g. "/mese")
 * @prop {string} priceSubtitle - Text below price (e.g. "per sempre", "flat, non per utente")
 * @prop {string} description - Plan description
 * @prop {string[]} features - List of included features
 * @prop {string} ctaText - CTA button text
 * @prop {string} ctaNote - Small text below CTA
 * @prop {boolean} highlighted - Whether this is the recommended plan
 * @prop {string} badge - Optional badge text (e.g. "Consigliato")
 * @prop {function} onCtaClick - Click handler for CTA
 */
export default function PricingCard({
    name, price, currency, period, priceSubtitle, description,
    features, ctaText, ctaNote, highlighted = false, badge, onCtaClick
}) {
    return (
        <div className={`
            rounded-2xl p-8 relative flex flex-col h-full
            ${highlighted
                ? 'bg-dark-800 border-2 border-primary-from/50 shadow-glow'
                : 'glass-card'
            }
        `}>
            {/* Badge */}
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-xs font-semibold rounded-full bg-gradient-primary text-white shadow-glow">
                        {badge}
                    </span>
                </div>
            )}

            {/* Plan name */}
            <h3 className="text-lg font-semibold text-dark-200 mb-4">{name}</h3>

            {/* Price */}
            <div className="mb-4">
                {price === 'Gratis' || price === 'Custom' ? (
                    <div className="text-4xl font-bold text-dark-100">{price}</div>
                ) : (
                    <div className="flex items-baseline gap-1">
                        {currency && <span className="text-dark-400 text-lg">{currency}</span>}
                        <span className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">{price}</span>
                        {period && <span className="text-dark-400 text-base">{period}</span>}
                    </div>
                )}
                {priceSubtitle && (
                    <p className="text-dark-500 text-sm mt-1">{priceSubtitle}</p>
                )}
            </div>

            {/* Description */}
            <p className="text-dark-400 text-sm mb-6">{description}</p>

            {/* Features list */}
            <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-sm ${feature.startsWith('**') ? 'text-dark-100 font-medium' : 'text-dark-300'}`}>
                            {feature.replace(/\*\*/g, '')}
                        </span>
                    </li>
                ))}
            </ul>

            {/* CTA */}
            <button
                onClick={onCtaClick}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    highlighted
                        ? 'btn-primary text-center'
                        : 'btn-secondary text-center'
                }`}
            >
                {ctaText}
            </button>
            {ctaNote && (
                <p className="text-dark-500 text-xs text-center mt-2">{ctaNote}</p>
            )}
        </div>
    )
}
```

---

### 3.9 KillerFeatureCard

**File**: `src/components/landing/KillerFeatureCard.jsx`
**Purpose**: Large, prominent feature card for the 3 killer features.

```jsx
/**
 * @prop {ReactNode} icon - SVG icon
 * @prop {string} badge - Badge text (e.g. "Esclusivo", "Killer Feature")
 * @prop {string} title - Feature title
 * @prop {string} description - Feature description
 * @prop {string} benefitLine - Benefit summary
 * @prop {string} color - Accent color key (blue, orange, green)
 */
export default function KillerFeatureCard({ icon, badge, title, description, benefitLine, color = 'blue' }) {
    const colorMap = {
        blue: { border: 'border-l-accent-blue', badge: 'bg-accent-blue/20 text-accent-blue', icon: 'text-accent-blue bg-accent-blue/10' },
        orange: { border: 'border-l-accent-orange', badge: 'bg-accent-orange/20 text-accent-orange', icon: 'text-accent-orange bg-accent-orange/10' },
        green: { border: 'border-l-accent-green', badge: 'bg-accent-green/20 text-accent-green', icon: 'text-accent-green bg-accent-green/10' },
    }
    const c = colorMap[color] || colorMap.blue

    return (
        <div className={`glass-card p-8 border-l-4 ${c.border} hover:shadow-glow transition-all duration-300`}>
            {/* Badge */}
            {badge && (
                <span className={`inline-block px-3 py-1 text-xxs font-semibold rounded-full ${c.badge} uppercase tracking-wider mb-4`}>
                    {badge}
                </span>
            )}

            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                {icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-dark-100 mb-3">{title}</h3>

            {/* Description */}
            <p className="text-dark-300 text-sm leading-relaxed mb-4">{description}</p>

            {/* Benefit line */}
            <p className="text-dark-200 text-sm font-medium italic border-t border-dark-700 pt-4">
                {benefitLine}
            </p>
        </div>
    )
}
```

---

## 4. Section Specifications

### 4.1 LandingNavbar (Updated)

**File**: `src/components/landing/LandingNavbar.jsx`
**Changes**: Update nav links to match new section IDs, add scroll spy.

**Updated nav links**:
```jsx
const navLinks = [
    { label: 'Funzionalita', target: 'features' },
    { label: 'Come Funziona', target: 'how-it-works' },
    { label: 'Prezzi', target: 'pricing' },
    { label: 'FAQ', target: 'faq' },
]
```

**Key changes**:
- Replace `scrollToSection('pricing')` and `scrollToSection('faq')` targets to match new section IDs
- Add active link highlighting based on scroll position (optional, P3)

---

### 4.2 HeroSection (Updated)

**File**: `src/components/landing/HeroSection.jsx`
**Changes**: New headline, scroll indicator, improved mockup.

```jsx
<section className="relative min-h-[90vh] lg:min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
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
                    <button onClick={() => navigate('/login')} className="btn-primary text-lg px-8 py-4">
                        <span className="flex items-center gap-2">
                            Inizia Gratis
                            <svg className="w-5 h-5" ...arrow-right />
                        </span>
                    </button>
                    <button onClick={scrollToHowItWorks} className="btn-secondary text-lg px-8 py-4">
                        <span className="flex items-center gap-2">
                            Scopri come funziona
                            <svg className="w-5 h-5" ...chevron-down />
                        </span>
                    </button>
                </div>

                {/* Trust indicators - unchanged */}
                <div className="mt-12 flex flex-wrap gap-6 justify-center lg:justify-start text-dark-400 text-sm">
                    ...existing trust indicators...
                </div>
            </div>

            {/* Right: Hero Visual - existing mockup is fine for now */}
            <div className="relative animate-slide-in-right hidden lg:block">
                ...existing dashboard mockup...
            </div>
        </div>
    </div>

    {/* Scroll hint indicator */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-hint">
        <svg className="w-6 h-6 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
        </svg>
    </div>
</section>
```

**Key changes**:
1. New headline: "Smetti di Fare Report. Inizia a Decidere."
2. New sub-headline with specifics
3. Secondary CTA scrolls to "Come Funziona" instead of "Features"
4. `min-h-[90vh]` on mobile (was min-h-screen) to hint at content below
5. Hide mockup on mobile (`hidden lg:block`) to keep CTA visible
6. Add scroll hint indicator at bottom

---

### 4.3 SocialProofBar (NEW)

**File**: `src/components/landing/SocialProofBar.jsx`
**Purpose**: Compact trust bar with animated stat counters.

```jsx
import StatCounter from './StatCounter'

export default function SocialProofBar() {
    return (
        <section className="py-12 px-4 border-y border-dark-700/50 bg-dark-800/30">
            <div className="container mx-auto max-w-5xl">
                <p className="text-center text-dark-400 text-sm font-medium mb-8 uppercase tracking-wider">
                    Scelto da team che gestiscono migliaia di ore ogni mese
                </p>

                <div className="grid grid-cols-3 gap-8">
                    <StatCounter
                        value={500}
                        suffix="+"
                        label="Team attivi"
                        icon={/* users icon */}
                    />
                    <StatCounter
                        value={1}
                        suffix="M+"
                        label="Worklog tracciati"
                        icon={/* chart icon */}
                    />
                    <StatCounter
                        value={99.9}
                        suffix="%"
                        decimals={1}
                        label="Uptime garantito"
                        icon={/* shield icon */}
                    />
                </div>
            </div>
        </section>
    )
}
```

**Design notes**:
- Compact section, no glass-card - uses subtle border-y separator
- Stats are the focus - large animated numbers with gradient text
- Mobile: 3 columns maintained but with smaller text

---

### 4.4 PainPointsSection (NEW)

**File**: `src/components/landing/PainPointsSection.jsx`

```jsx
import PainPointCard from './PainPointCard'

export default function PainPointsSection() {
    const painPoints = [
        {
            icon: /* clock icon */,
            title: "Passo 4 ore a settimana a compilare report dai worklog JIRA",
            description: "Copi dati da JIRA in un foglio Excel, li formatti, li invii al management. Ogni settimana. Da mesi. E se ti dicessimo che puoi riavere quelle 4 ore?",
            persona: "Sara, Project Manager"
        },
        {
            icon: /* windows/tabs icon */,
            title: "Devo aprire 3 istanze JIRA per avere il quadro completo",
            description: "Un'istanza per il team frontend, una per il backend, una per il cliente. Tre login, tre dashboard, zero visione d'insieme. Suona familiare?",
            persona: "Marco, CTO"
        },
        {
            icon: /* invoice/calculator icon */,
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
```

---

### 4.5 HowItWorksSection (NEW)

**File**: `src/components/landing/HowItWorksSection.jsx`

```jsx
import StepCard from './StepCard'

export default function HowItWorksSection() {
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
                        icon={/* plug icon */}
                    />
                    <StepCard
                        number={2}
                        title="Visualizza"
                        description="La dashboard si popola automaticamente con i worklog del tuo team. Analytics per membro, per team, per Epic. Tutto in tempo reale, zero configurazione."
                        detail="Aggiornamento automatico"
                        icon={/* chart icon */}
                    />
                    <StepCard
                        number={3}
                        title="Fattura"
                        description="Genera fatture direttamente dai worklog con il billing integrato. Imposta le rate, seleziona il periodo, esporta in Excel. Tre click, fattura pronta."
                        detail="Export Excel in 3 secondi"
                        icon={/* download icon */}
                    />
                </div>

                {/* CTA */}
                <div className="text-center mt-12">
                    <button onClick={() => navigate('/login')} className="btn-primary text-lg px-8 py-4">
                        Inizia Gratis
                    </button>
                </div>
            </div>
        </section>
    )
}
```

**Design notes**:
- Horizontal connector line between step badges on desktop (using absolute positioned div with gradient)
- Steps are visually connected: badge numbers are the focal point
- Subtle gradient background differentiates from adjacent sections
- Mobile: stacks vertically, connector line hidden

---

### 4.6 FeaturesSection (Updated)

**File**: `src/components/landing/FeaturesSection.jsx`
**Changes**: Split into killer features (top, large) + standard features (bottom, smaller).

```jsx
import KillerFeatureCard from './KillerFeatureCard'
import FeatureCard from './FeatureCard'

export default function FeaturesSection() {
    const killerFeatures = [
        {
            badge: "Esclusivo",
            title: "Una dashboard, tutte le tue istanze JIRA",
            description: "L'unico tool che aggrega dati da 2, 3 o 10 istanze JIRA Cloud...",
            benefitLine: "Visione completa in un colpo d'occhio, non in 30 minuti di copia-incolla.",
            color: "blue",
            icon: /* grid/union icon */
        },
        {
            badge: "Killer Feature",
            title: "Da worklog a fattura in 3 click",
            description: "Basta calcolare ore a mano. Imposta le rate per utente o per progetto...",
            benefitLine: "Fatture pronte in secondi, non in ore. Zero errori di calcolo.",
            color: "orange",
            icon: /* invoice icon */
        },
        {
            badge: "Unico sul mercato",
            title: "Worklog JIRA + dati HR in un unico sistema",
            description: "Collega Factorial per vedere ferie, permessi e presenze...",
            benefitLine: "Basta riconciliazione manuale tra JIRA e HR.",
            color: "green",
            icon: /* people/HR icon */
        }
    ]

    const standardFeatures = [
        { title: "Metriche del team, sempre aggiornate", description: "Ore totali, trend giornalieri...", color: "cyan", icon: /* bar chart */ },
        { title: "Scopri dove vanno davvero le ore", description: "Breakdown per Epic con contributori...", color: "purple", icon: /* search */ },
        { title: "I tuoi dati sono solo tuoi", description: "Ogni azienda ha i propri dati completamente isolati...", color: "pink", icon: /* shield */ }
    ]

    return (
        <section id="features" className="section-padding bg-dark-800/30">
            <div className="container mx-auto max-w-7xl">
                <div className="section-header">
                    <h2 className="section-title">Perche i team scelgono Worklog Dashboard</h2>
                    <p className="section-subtitle">
                        Gli strumenti che ti servono per passare da "non so dove vanno le ore"
                        a "ho tutto sotto controllo". Senza complessita.
                    </p>
                </div>

                {/* Killer Features - large cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {killerFeatures.map((feature, i) => (
                        <KillerFeatureCard key={i} {...feature} />
                    ))}
                </div>

                {/* Standard Features - smaller cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {standardFeatures.map((feature, i) => (
                        <FeatureCard key={i} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    )
}
```

**Design notes**:
- Killer features use `KillerFeatureCard` with left color border and badge
- Standard features use existing `FeatureCard` component
- Clear visual hierarchy between the two tiers
- Section header updated per copy doc

---

### 4.7 BillingShowcaseSection (NEW)

**File**: `src/components/landing/BillingShowcaseSection.jsx`
**Purpose**: Deep dive on the killer billing feature with split layout.

```jsx
export default function BillingShowcaseSection() {
    const features = [
        "Rate personalizzate: Per utente, per progetto o per cliente",
        "Preview in-app: Vedi la fattura prima di esportarla",
        "Export Excel: Formato pronto per la contabilita, generato in 3 secondi",
        "Storico completo: Tutte le fatture archiviate e consultabili",
        "Classificazione ore: Fatturabili, non fatturabili, interne"
    ]

    return (
        <section className="section-padding bg-dark-900">
            <div className="container mx-auto max-w-7xl">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Screenshot/mockup placeholder */}
                    <div className="glass-card p-6 shadow-2xl">
                        {/* Billing module mockup */}
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-dark-600">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-accent-orange" />
                                <div className="w-3 h-3 rounded-full bg-accent-green" />
                            </div>
                            <div className="flex-1 bg-dark-700 rounded px-3 py-1 text-xs text-dark-400">
                                billing
                            </div>
                        </div>

                        {/* Mock billing content */}
                        <div className="space-y-3">
                            {/* Mock invoice header */}
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-dark-600 rounded w-32" />
                                <div className="h-6 bg-accent-green/20 text-accent-green text-xs px-2 py-1 rounded">Pronta</div>
                            </div>
                            {/* Mock table rows */}
                            {[1,2,3,4].map(i => (
                                <div key={i} className="flex gap-3 items-center">
                                    <div className="h-3 bg-dark-700 rounded flex-1" />
                                    <div className="h-3 bg-dark-700 rounded w-16" />
                                    <div className="h-3 bg-gradient-primary rounded w-12" />
                                </div>
                            ))}
                            {/* Mock total */}
                            <div className="flex justify-end pt-3 border-t border-dark-700">
                                <div className="h-5 bg-gradient-primary rounded w-24" />
                            </div>
                        </div>
                    </div>

                    {/* Right: Text content */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-dark-100 mb-4">
                            La fatturazione che i team JIRA aspettavano da anni
                        </h2>
                        <p className="text-dark-300 text-lg mb-6 leading-relaxed">
                            Il billing integrato e la nostra feature piu richiesta.
                            E l'unica ragione per cui molti team smettono di usare fogli Excel per fatturare.
                        </p>

                        {/* Feature checklist */}
                        <ul className="space-y-3 mb-8">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-dark-200 text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Stat highlight */}
                        <div className="glass-card p-4 inline-flex items-center gap-3 mb-6">
                            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">6h</div>
                            <p className="text-dark-300 text-sm">risparmiate al mese in media sulla fatturazione</p>
                        </div>

                        <div>
                            <button className="btn-primary text-lg px-8 py-3">
                                Prova il Billing Gratis
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
```

**Design notes**:
- Split layout: mockup left, text right
- Mockup reuses same browser-chrome pattern from HeroSection for consistency
- Feature checklist with green checkmarks
- Stat highlight in a small glass-card to draw attention
- CTA specific to billing feature

---

### 4.8 IntegrationsSection (NEW)

**File**: `src/components/landing/IntegrationsSection.jsx`

```jsx
import IntegrationCard from './IntegrationCard'

export default function IntegrationsSection() {
    const integrations = [
        {
            name: "Atlassian JIRA Cloud",
            description: "Connessione diretta a una o piu istanze JIRA Cloud. Sincronizzazione automatica di worklogs, Epic, Issues e progetti.",
            detail: "Supporto multi-istanza nativo",
            logo: /* JIRA SVG logo */,
        },
        {
            name: "Tempo Timesheets",
            description: "Integrazione nativa con Tempo API v4. Date filtering avanzato, worklog granulari, sync ottimizzata per grandi volumi di dati.",
            detail: "Sync piu veloce e precisa",
            logo: /* Tempo SVG logo */,
        },
        {
            name: "Factorial",
            description: "Importa ferie, permessi e presenze dal tuo sistema HR. Visualizza la disponibilita reale del team accanto ai worklog JIRA.",
            detail: "Unico sul mercato",
            logo: /* Factorial SVG logo */,
        },
        {
            name: "Google",
            description: "Login con il tuo account Google aziendale. Nessuna password da ricordare, nessun account da creare. Un click e sei dentro.",
            detail: "Setup istantaneo",
            logo: /* Google SVG logo */,
        }
    ]

    return (
        <section id="integrations" className="section-padding gradient-section-bg">
            <div className="container mx-auto max-w-5xl">
                <div className="section-header">
                    <h2 className="section-title">Si integra con gli strumenti che usi gia</h2>
                    <p className="section-subtitle">
                        Nessun tool in piu da imparare. Worklog Dashboard si connette ai tuoi sistemi
                        esistenti e centralizza tutto in un unico posto.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {integrations.map((integration, i) => (
                        <IntegrationCard key={i} {...integration} />
                    ))}
                </div>

                <p className="text-center text-dark-500 text-sm mt-8">
                    Non trovi la tua integrazione?{' '}
                    <button className="text-accent-blue hover:underline">Contattaci</button>
                    {' '}- ne aggiungiamo di nuove ogni mese.
                </p>
            </div>
        </section>
    )
}
```

**Design notes**:
- 4-column grid on desktop, 2 columns on tablet, 1 on mobile
- Cards use glass-card base (not hoverable - these are informational)
- Logo containers are 16x16 squares with dark-700 background
- Detail badges use accent-blue pill style
- Subtle gradient background to distinguish from adjacent sections

---

### 4.9 UseCasesSection (NEW)

**File**: `src/components/landing/UseCasesSection.jsx`

```jsx
import UseCaseCard from './UseCaseCard'

export default function UseCasesSection() {
    const useCases = [
        {
            persona: "Sara M., Project Manager",
            personaDetail: "gestisce 2 team di sviluppo",
            scenarioBefore: "Ogni venerdi passavo 3-4 ore a raccogliere i worklog da JIRA, copiarli in Excel, calcolare le ore per membro e inviare il report al CTO.",
            scenarioAfter: "Ora apro la dashboard e il report e gia pronto. Vedo chi ha loggato e chi no in tempo reale. Il venerdi pomeriggio lo uso per lavorare, non per compilare tabelle.",
            result: "Da 4 ore di report a 0. Ogni settimana.",
            accentColor: "blue"
        },
        {
            persona: "Marco R., CTO",
            personaDetail: "5 team, 3 istanze JIRA Cloud",
            scenarioBefore: "Avevamo 3 istanze JIRA per ragioni storiche. Per avere una visione d'insieme dovevo accedere a ciascuna, esportare i dati, e aggregarli manualmente.",
            scenarioAfter: "Ho connesso le 3 istanze in 10 minuti. Ora vedo tutti i team, tutti i progetti, tutte le ore in un'unica dashboard.",
            result: "Visione unificata su 5 team e 40 sviluppatori.",
            accentColor: "green"
        },
        {
            persona: "Andrea B., Finance Director",
            personaDetail: "fatturazione mensile per 8 clienti",
            scenarioBefore: "Ogni fine mese era un incubo. Dovevo chiedere ai PM le ore per cliente, verificare i dati, calcolare le rate, preparare le fatture in Excel.",
            scenarioAfter: "Seleziono il cliente, il periodo, e la fattura si genera da sola con le ore corrette. Per 8 clienti ci metto 20 minuti invece di 2 giorni.",
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
```

**Design notes**:
- 3-column grid with before/after story structure
- Each card has distinct accent color matching the persona
- "Before" uses red-tinted label + plain border, "After" uses green-tinted label + colored border
- Result badge at bottom creates visual completion
- The 4th use case (Elena, HR) is omitted to keep 3-column grid balanced. Can be added later.

---

### 4.10 TestimonialsSection (NEW)

**File**: `src/components/landing/TestimonialsSection.jsx`

```jsx
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
            quote: "Ho eliminato completamente i report manuali del venerdi. La dashboard mi da tutto quello che mi serve in tempo reale. Il mio management e piu contento, e io ho 4 ore in piu a settimana.",
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

                {/* Testimonial cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {testimonials.map((testimonial, i) => (
                        <TestimonialCard key={i} {...testimonial} />
                    ))}
                </div>

                {/* Stats bar */}
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
```

**Design notes**:
- 3-column testimonial grid, all cards equal height (flex h-full)
- Stats bar below in a glass-card container for emphasis
- Stats grid: 4 cols on desktop, 2 cols on mobile
- Gradient section bg to create visual break
- Star ratings use accent-orange for filled stars

---

### 4.11 PricingSection (NEW)

**File**: `src/components/landing/PricingSection.jsx`

```jsx
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
                "**Tutto del piano Free, piu:**",
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
                "**Tutto del piano Pro, piu:**",
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

                {/* Pricing differentiator */}
                <p className="text-center text-dark-400 text-sm">
                    <strong className="text-dark-200">Nessun costo per utente. Mai.</strong>{' '}
                    A differenza di Tempo ($8/utente/mese) o Clockify ($12/utente/mese),
                    il nostro pricing e flat. Che tu abbia 5 o 500 utenti, il prezzo non cambia.
                </p>

                {/* Guarantee */}
                <p className="text-center text-dark-500 text-xs mt-4">
                    Non soddisfatto? Cancella in qualsiasi momento, senza domande. I tuoi dati restano tuoi.
                </p>
            </div>
        </section>
    )
}
```

**Design notes**:
- 3-column grid, Pro plan highlighted with border-primary and shadow-glow
- Pro plan badge ("Consigliato") floats above the card with gradient background
- Price display: Free shows "Gratis" text, Pro shows large "29" with gradient, Enterprise shows "Custom"
- Feature lists use green checkmarks
- Bold items in feature list (prefixed with **) render with heavier weight
- max-w-5xl (narrower than 7xl) to keep cards closer together
- Competitor pricing comparison at bottom for anchoring effect

---

### 4.12 FAQSection (NEW)

**File**: `src/components/landing/FAQSection.jsx`

```jsx
import FAQItem from './FAQItem'

export default function FAQSection() {
    const faqs = [
        {
            question: "E davvero gratis? Qual e il catch?",
            answer: "Nessun catch. Il piano Free e gratuito per sempre e include tutto il necessario per un singolo team con una istanza JIRA. Non chiediamo carta di credito, non ci sono costi nascosti, non limitiamo le funzionalita nel tempo. Il piano Pro a 29 EUR/mese (flat, non per utente) e per chi ha bisogno di piu istanze, billing automatico e integrazioni avanzate."
        },
        {
            question: "I miei dati JIRA sono al sicuro?",
            answer: "Assolutamente. Utilizziamo un'architettura multi-tenant con isolamento completo dei dati: ogni azienda ha il proprio spazio separato, invisibile agli altri. L'autenticazione avviene tramite Google OAuth (nessuna password salvata da noi), e tutte le connessioni sono crittografate."
        },
        {
            question: "Funziona con Tempo Timesheets?",
            answer: "Si, abbiamo un'integrazione nativa con Tempo API v4. Se il tuo team usa Tempo per il time tracking, Worklog Dashboard sincronizza i dati direttamente da Tempo con date filtering avanzato e sync ottimizzata. Se non usi Tempo, funzioniamo anche con i worklog nativi di JIRA."
        },
        {
            question: "Posso collegare piu istanze JIRA?",
            answer: "Si, ed e una delle nostre funzionalita esclusive. Puoi collegare 2, 3 o 10 istanze JIRA Cloud e vederle tutte aggregate in un'unica dashboard. Supportiamo anche le 'istanze complementari' - le ore vengono deduplicate automaticamente nella vista aggregata."
        },
        {
            question: "Quanto tempo serve per il setup?",
            answer: "5 minuti, in media. Il processo e: 1) Login con Google, 2) Inserisci URL e API token della tua istanza JIRA, 3) Avvia la prima sincronizzazione. Nessun software da installare, nessun consulente da chiamare."
        },
        {
            question: "Posso esportare i dati?",
            answer: "Si, tutti i dati sono esportabili in formato Excel. Il billing module genera fatture in formato Excel pronto per la contabilita. Non facciamo lock-in: i tuoi dati sono sempre accessibili e esportabili."
        },
        {
            question: "Come funziona la fatturazione automatica?",
            answer: "Il modulo billing ti permette di: 1) Impostare rate orarie per utente, progetto o cliente, 2) Selezionare un periodo temporale, 3) Generare una fattura con preview in-app, 4) Esportare in Excel. Le ore vengono calcolate direttamente dai worklog JIRA, zero errori di trascrizione."
        },
        {
            question: "Che succede se la mia azienda cresce?",
            answer: "Il piano Free supporta fino a 5 utenti. Se il tuo team cresce, puoi passare al piano Pro (29 EUR/mese flat) che non ha limiti su utenti, team o istanze JIRA. Il bello del pricing flat e che non devi preoccuparti del costo per ogni nuovo membro."
        }
    ]

    return (
        <section id="faq" className="section-padding bg-dark-800/30">
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

                <p className="text-center text-dark-500 text-sm mt-6">
                    Non trovi la tua domanda?{' '}
                    <button className="text-accent-blue hover:underline">Contattaci</button>
                </p>
            </div>
        </section>
    )
}
```

**Design notes**:
- Narrow container (max-w-3xl) for easy readability
- All FAQs inside one glass-card with dividers
- First item open by default to show the interaction pattern
- Smooth accordion with max-h transition
- Questions change color on hover (primary-from)
- Chevron rotates 180deg when open

---

### 4.13 FinalCTASection (NEW)

**File**: `src/components/landing/FinalCTASection.jsx`

```jsx
import { useNavigate } from 'react-router-dom'

export default function FinalCTASection() {
    const navigate = useNavigate()

    return (
        <section className="py-20 px-4 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-from/20 via-dark-800 to-primary-to/20" />
            <div className="absolute inset-0 bg-gradient-radial from-primary-from/10 via-transparent to-transparent opacity-50" />

            <div className="container mx-auto max-w-3xl relative z-10 text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-dark-100 mb-6 leading-tight">
                    Pronto a smettere di perdere tempo con i report manuali?
                </h2>

                <p className="text-xl text-dark-300 mb-10 leading-relaxed max-w-2xl mx-auto">
                    Unisciti ai team che hanno gia automatizzato il tracking delle ore e la fatturazione.
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

                {/* Trust indicators */}
                <div className="mt-8 flex flex-wrap gap-6 justify-center text-dark-400 text-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Setup in 5 minuti</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Nessuna carta di credito</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Cancella quando vuoi</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
```

**Design notes**:
- Prominent gradient background to create visual "break" before footer
- Gradient uses primary-from/to with low opacity for subtlety
- Large centered text, single prominent CTA
- Trust indicators mirror hero section for consistency
- This is the last conversion opportunity - make it count

---

### 4.14 LandingFooter (Updated)

**File**: `src/components/landing/LandingFooter.jsx`
**Changes**: Add Resources column, update description, update link targets.

**Updated structure** (4 columns):

```
Brand (2-col)          | Prodotto           | Risorse            | Legale
Worklog Dashboard      | Funzionalita (#)   | Documentazione (#) | Privacy Policy (#)
Description text       | Integrazioni (#)   | Guide Setup (#)    | Termini di Servizio
                       | Prezzi (#pricing)  | API Reference (#)  | Cookie Policy (#)
                       | Changelog (#)      | Blog (#)           | GDPR Compliance (#)
                       | Status Page (#)    | Community (#)      |
```

**Key changes**:
- Update brand description to match copy doc
- Add "Risorse" column with links
- Rename "Legale" items to match copy
- Update "Prodotto" links (Funzionalita -> #features, Prezzi -> #pricing, etc.)
- Keep existing social icons (Twitter/X, GitHub, LinkedIn)

---

## 5. Animation & Interaction Specs

### Scroll-triggered Animations

| Element | Animation | Trigger | Duration |
|---------|-----------|---------|----------|
| StatCounter numbers | Count up from 0 | IntersectionObserver (30% visible) | 2000ms |
| Section headers | Fade in + slide up | Scroll into view | 500ms |
| Feature cards | Fade in with stagger | Scroll into view | 300ms per card, 100ms delay |
| Pain point cards | Fade in | Scroll into view | 500ms |
| Step cards | Fade in sequentially | Scroll into view | 300ms, 200ms stagger |
| Testimonial cards | Fade in | Scroll into view | 500ms |

### Interactive States

| Element | Hover | Active | Focus |
|---------|-------|--------|-------|
| glass-card-hover | bg-dark-700/80, border-dark-500/50, shadow-glow, -translate-y-1 | scale-95 | ring-2 ring-primary-from/50 |
| btn-primary | shadow-lg, scale-105 | scale-95 | ring-2 ring-primary-from/50 |
| btn-secondary | bg-dark-600, border-dark-500 | scale-95 | ring-2 ring-dark-500/50 |
| FAQItem question | text-primary-from | - | outline via focus-visible |
| IntegrationCard | border-dark-500/50 | - | - |
| PainPointCard | border-accent-orange/30 | - | - |
| Nav links | text-dark-100 | - | - |

### FAQ Accordion

- **Open**: max-h-0 -> max-h-96, opacity 0 -> 1, 300ms ease-out
- **Close**: max-h-96 -> max-h-0, opacity 1 -> 0, 200ms ease-in (faster close)
- **Chevron**: rotate-0 -> rotate-180, 300ms transition-transform

### Scroll Hint (Hero)

- Bouncing chevron at bottom of hero
- Uses `animate-scroll-hint` keyframe
- Disappears on scroll (optional: via IntersectionObserver on hero)

---

## 6. Responsive Breakpoints

### Mobile-first approach (existing Tailwind breakpoints)

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| Default (mobile) | < 768px | Single column, stacked layouts |
| `md` | >= 768px | 2-3 column grids, side-by-side |
| `lg` | >= 1024px | Full layouts, hero 2-col grid |

### Section-specific responsive behavior

| Section | Mobile | Tablet (md) | Desktop (lg) |
|---------|--------|-------------|--------------|
| Hero | Stack, hide mockup, min-h-[90vh] | Stack, show mockup | 2-col grid, min-h-screen |
| Social Proof | 3-col (compact) | 3-col | 3-col |
| Pain Points | 1-col stack | 3-col | 3-col |
| How It Works | 1-col stack, no connector | 3-col, connector line | 3-col, connector line |
| Features (killer) | 1-col stack | 3-col | 3-col |
| Features (standard) | 1-col stack | 3-col | 3-col |
| Billing Showcase | Stack (text above mockup) | 2-col | 2-col |
| Integrations | 1-col | 2-col | 4-col |
| Use Cases | 1-col stack | 3-col | 3-col |
| Testimonials | 1-col stack | 3-col | 3-col |
| Stats bar | 2-col grid | 4-col | 4-col |
| Pricing | 1-col stack | 3-col | 3-col |
| FAQ | Full width | max-w-3xl centered | max-w-3xl centered |
| Final CTA | Full width, smaller text | Centered | Centered |

### Mobile-specific UX

1. **Hero mockup hidden on mobile** (`hidden lg:block`) - keeps CTA visible above fold
2. **Hero min-height reduced** to `min-h-[90vh]` on mobile to hint at content below
3. **Scroll hint** visible on all sizes to encourage scrolling
4. **Touch targets**: All buttons min 44px height (py-3 or py-4)
5. **Social Proof stats**: Maintained as 3-col but with smaller font sizes
6. **FAQ accordion**: Full-width tap targets, generous padding

---

## 7. New Tailwind Extensions Required

### Additions to `tailwind.config.js`

```js
// theme.extend.backgroundImage - add:
'gradient-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',

// theme.extend.animation - add:
'scroll-hint': 'scrollHint 2s ease-in-out infinite',
'float': 'float 3s ease-in-out infinite',

// theme.extend.keyframes - add:
scrollHint: {
    '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
    '50%': { transform: 'translateY(8px)', opacity: '1' },
},
float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
},
```

### Additions to `index.css`

```css
@layer components {
    .section-padding {
        @apply py-20 lg:py-28 px-4;
    }

    .section-header {
        @apply text-center mb-16;
    }

    .section-title {
        @apply text-4xl md:text-5xl font-bold text-dark-100 mb-4;
    }

    .section-subtitle {
        @apply text-xl text-dark-300 max-w-2xl mx-auto leading-relaxed;
    }

    .gradient-section-bg {
        @apply relative overflow-hidden;
        background: linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
    }
}
```

---

## 8. File Summary

### New Files to Create (13 files)

| File | Type | Component |
|------|------|-----------|
| `src/components/landing/StatCounter.jsx` | Reusable | Animated stat counter |
| `src/components/landing/IntegrationCard.jsx` | Reusable | Integration logo card |
| `src/components/landing/UseCaseCard.jsx` | Reusable | Before/after scenario card |
| `src/components/landing/TestimonialCard.jsx` | Reusable | Quote + author card |
| `src/components/landing/FAQItem.jsx` | Reusable | Accordion FAQ item |
| `src/components/landing/PainPointCard.jsx` | Reusable | Empathy pain card |
| `src/components/landing/StepCard.jsx` | Reusable | Numbered step card |
| `src/components/landing/PricingCard.jsx` | Reusable | Pricing tier card |
| `src/components/landing/KillerFeatureCard.jsx` | Reusable | Prominent feature card |
| `src/components/landing/SocialProofBar.jsx` | Section | Trust metrics bar |
| `src/components/landing/PainPointsSection.jsx` | Section | Pain points section |
| `src/components/landing/HowItWorksSection.jsx` | Section | 3-step flow section |
| `src/components/landing/BillingShowcaseSection.jsx` | Section | Billing deep dive |
| `src/components/landing/IntegrationsSection.jsx` | Section | Integration grid |
| `src/components/landing/UseCasesSection.jsx` | Section | Use case stories |
| `src/components/landing/TestimonialsSection.jsx` | Section | Testimonials + stats |
| `src/components/landing/PricingSection.jsx` | Section | Pricing tiers |
| `src/components/landing/FAQSection.jsx` | Section | FAQ accordion |
| `src/components/landing/FinalCTASection.jsx` | Section | Final conversion CTA |

### Files to Modify (4 files)

| File | Changes |
|------|---------|
| `src/pages/Landing.jsx` | Add imports for all new sections, update component tree |
| `src/components/landing/HeroSection.jsx` | New headline, hide mockup on mobile, add scroll hint |
| `src/components/landing/FeaturesSection.jsx` | Split into killer + standard features, new header copy |
| `src/components/landing/LandingFooter.jsx` | Add Resources column, update description and links |
| `src/components/landing/LandingNavbar.jsx` | Update nav link labels and scroll targets |
| `frontend/tailwind.config.js` | Add new animations (scroll-hint, float) |
| `frontend/src/index.css` | Add section utility classes |

### Existing Dependencies Used

| Dependency | Used By |
|------------|---------|
| `useCountUp` hook (`src/hooks/useCountUp.js`) | StatCounter component |
| `react-router-dom` (useNavigate) | Sections with CTA buttons |
| `glass-card` / `glass-card-hover` CSS classes | All card components |
| `btn-primary` / `btn-secondary` CSS classes | All CTA buttons |

---

*Design specification created by UI Designer for the landing-optimization team. February 2026.*
*References: `MARKETING_STRATEGY.md`, `UX_ANALYSIS.md`, `LANDING_COPY.md`.*
*Ready for implementation by the Frontend Developer (Task #5).*
