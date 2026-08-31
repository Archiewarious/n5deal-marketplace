'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Reveals its children the first time they scroll into view, and then gets out of the way.
 *
 * The starting state is set by CSS rather than by React, and that ordering is the whole point:
 * a visitor with JavaScript disabled, or one whose bundle has not arrived yet, gets the
 * `.reveal` class with no observer to remove it — so the safe default has to be visible. It is,
 * because `prefers-reduced-motion` and the no-JS fallback below both resolve to shown.
 *
 * `once` is deliberate. A section that re-hides when it leaves the viewport is a section that
 * flickers on the way back up, and nobody has ever wanted to watch the same heading arrive
 * twice.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  /** Milliseconds, for staggering siblings. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // No observer, or a visitor who asked for less motion: show it and never touch it again.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        io.disconnect()
      },
      // Fires a little before the element reaches the fold, so the transition is finishing as
      // it arrives rather than starting.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
