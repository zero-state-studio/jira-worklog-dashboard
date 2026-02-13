import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
    const navigate = useNavigate()

    // Auto-redirect authenticated users to dashboard
    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (token) {
            navigate('/app/dashboard')
        }
    }, [navigate])

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
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
