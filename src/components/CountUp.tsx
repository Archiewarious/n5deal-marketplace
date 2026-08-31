'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Counts a figure up to its real value once, when it first comes into view.
 *
 * The reference site puts a live total in its header and it is the single element that makes a
 * catalogue read as a market. A number that arrives already at rest is a fact; a number that
 * climbs is a market. Nothing here is fake: the target is the real sum, the animation only
 * chooses how the eye gets to it.
 *
 * The rendered text starts at the final value rather than at zero, so a crawler, a printout and
 * a visitor with no JavaScript all read the true figure. Only a browser that runs this effect
 * ever sees it lower than it is.
 */
export function CountUp({
  value,
  format,
  durationMs = 1100,
  className = '',
}: {
  value: number
  /** How to render the number at each step — the caller owns the currency and the locale. */
  format: (n: number) => string
  durationMs?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setN(value)
      return
    }

    let raf = 0
    let start = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const step = (ts: number) => {
          if (!start) start = ts
          const p = Math.min(1, (ts - start) / durationMs)
          // Ease out: the number decelerates into its final value instead of stopping dead.
          setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
          if (p < 1) raf = requestAnimationFrame(step)
        }
        setN(0)
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, durationMs])

  return (
    <span ref={ref} className={className}>
      {format(n)}
    </span>
  )
}
