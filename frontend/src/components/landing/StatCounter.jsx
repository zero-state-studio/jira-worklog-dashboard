import { useCountUp } from '../../hooks/useCountUp'
import { useRef, useState, useEffect } from 'react'

export default function StatCounter({ value, suffix = '', prefix = '', label, decimals = 0, icon, duration = 2000 }) {
    const ref = useRef(null)
    const [isVisible, setIsVisible] = useState(false)

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
