import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function Landing() {
    // Landing page is now always visible, even for logged-in users
    // Users can navigate to /app/dashboard via the Login button in LandingNavbar

    return (
        <div className="min-h-screen bg-dark-900">
            <LandingNavbar />
            <HeroSection />
            <FeaturesSection />
            <LandingFooter />
        </div>
    )
}
