import { useEffect, useState, useRef } from 'react'

/**
 * Custom hook for animating numbers with a count-up effect
 * @param {number} end - Target number to count up to
 * @param {number} duration - Animation duration in milliseconds (default: 1000)
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {boolean} enabled - Whether animation is enabled (default: true)
 * @returns {string} The animated count value as a formatted string
 */
export function useCountUp(end, duration = 1000, decimals = 0, enabled = true) {
  const [count, setCount] = useState(0)
  const endRef = useRef(end)
  const frameRef = useRef(null)

  useEffect(() => {
    // If animation is disabled, set value immediately
    if (!enabled) {
      setCount(end)
      return
    }

    // Update ref when end value changes
    endRef.current = end

    let startTime = null
    const startValue = 0

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Easing function (ease-out cubic for smooth deceleration)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const currentCount = startValue + (endRef.current - startValue) * easeOutCubic
      setCount(currentCount)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setCount(endRef.current)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    // Cleanup function
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [end, duration, enabled])

  return count.toFixed(decimals)
}

/**
 * Hook variant that formats the result as hours (e.g., "123.5h")
 * @param {number} end - Target hours to count up to
 * @param {number} duration - Animation duration in milliseconds (default: 1000)
 * @returns {string} The animated hours with "h" suffix
 */
export function useCountUpHours(end, duration = 1000) {
  const count = useCountUp(end, duration, 1)
  return `${count}h`
}

/**
 * Hook variant that formats the result as percentage (e.g., "85%")
 * @param {number} end - Target percentage to count up to
 * @param {number} duration - Animation duration in milliseconds (default: 1000)
 * @returns {string} The animated percentage with "%" suffix
 */
export function useCountUpPercentage(end, duration = 1000) {
  const count = useCountUp(end, duration, 0)
  return `${count}%`
}
