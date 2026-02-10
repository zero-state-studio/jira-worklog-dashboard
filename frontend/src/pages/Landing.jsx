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
