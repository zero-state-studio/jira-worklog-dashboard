import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingNavbar() {
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('access_token')
        setIsLoggedIn(!!token)
    }, [])

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            setMobileMenuOpen(false)
        }
    }

    return (
        <nav className="sticky top-0 z-50 bg-dark-800/80 backdrop-blur-xl border-b border-dark-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="font-bold text-dark-100 text-lg">Worklog Dashboard</h1>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <button
                            onClick={() => scrollToSection('features')}
                            className="text-dark-300 hover:text-dark-100 transition-colors font-medium"
                        >
                            Features
                        </button>
                        <button
                            onClick={() => scrollToSection('pricing')}
                            className="text-dark-300 hover:text-dark-100 transition-colors font-medium"
                        >
                            Pricing
                        </button>
                        <button
                            onClick={() => scrollToSection('faq')}
                            className="text-dark-300 hover:text-dark-100 transition-colors font-medium"
                        >
                            FAQ
                        </button>
                    </div>

                    {/* Desktop CTA Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {isLoggedIn ? (
                            <button
                                onClick={() => navigate('/app/dashboard')}
                                className="btn-primary flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Vai alla Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="btn-secondary"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="btn-primary"
                                >
                                    Inizia Gratis
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-dark-300 hover:text-dark-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-dark-700 animate-slide-up">
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => scrollToSection('features')}
                                className="text-dark-300 hover:text-dark-100 transition-colors font-medium text-left"
                            >
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection('pricing')}
                                className="text-dark-300 hover:text-dark-100 transition-colors font-medium text-left"
                            >
                                Pricing
                            </button>
                            <button
                                onClick={() => scrollToSection('faq')}
                                className="text-dark-300 hover:text-dark-100 transition-colors font-medium text-left"
                            >
                                FAQ
                            </button>
                            <div className="flex flex-col gap-2 pt-2 border-t border-dark-700">
                                {isLoggedIn ? (
                                    <button
                                        onClick={() => navigate('/app/dashboard')}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                        Vai alla Dashboard
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="btn-secondary w-full"
                                        >
                                            Login
                                        </button>
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="btn-primary w-full"
                                        >
                                            Inizia Gratis
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
