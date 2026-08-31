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
 *
 * Every prop is a primitive, and that is not a style choice: this is a client component rendered
 * by a server one, and a function prop crosses that boundary as a serialisation error rather
 * than as a callback. The first version took `format` and took the landing page down with it.
 */
export function CountUp({
  value,
  money = false,
  tag = 'en-GB',
  durationMs = 1100,
  className = '',
}: {
  value: number
  /** Render as euros. The value is then in cents, matching how money is stored everywhere. */
  money?: boolean
  /** Intl tag, so the grouping follows the language the page is in. */
  tag?: string
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
        // The count starts inside the first frame, never before it. requestAnimationFrame does
        // not run in a hidden or backgrounded tab, and an earlier version set the display to
        // zero first — so a page that was scrolled while hidden showed a real total of zero and
        // stayed there. Leaving the value alone until a frame actually arrives means the worst
        // case is no animation, which is the correct worst case.
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

  const text = money
    ? new Intl.NumberFormat(tag, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(n / 100)
    : new Intl.NumberFormat(tag).format(n)

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  )
}
