'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/LocaleProvider'

// Three states, not two: light, dark, and "whatever the system says", which is the state
// everyone starts in and the only one that is correct until someone actually chooses. The
// stored value is the choice, and its absence means no choice has been made — which is why
// this cycles back round to `system` rather than being a two-way switch.
type Theme = 'light' | 'dark' | 'system'

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }

const LABEL_KEY: Record<Theme, string> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
}

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    delete root.dataset.theme
    localStorage.removeItem('theme')
  } else {
    root.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }
}

export function ThemeToggle() {
  const t = useT()
  // Starts at `system` on the server and on the first client render, so the markup matches.
  // The real value arrives in the effect; the flash it would otherwise cause is prevented by
  // the inline script in the layout, which runs before first paint.
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      // A private window can throw on localStorage. Following the system is a fine fallback.
    }
  }, [])

  function cycle() {
    const next = NEXT[theme]
    setTheme(next)
    try {
      apply(next)
    } catch {
      document.documentElement.dataset.theme = next === 'system' ? '' : next
    }
  }

  return (
    <button
      onClick={cycle}
      title={t(LABEL_KEY[theme])}
      aria-label={`${t(LABEL_KEY[theme])}. ${t('theme.change')}`}
      className="grid size-8 shrink-0 place-items-center rounded-full border text-muted transition hover:text-fg"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" aria-hidden>
          <path
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ) : theme === 'light' ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="4" strokeWidth="1.6" />
          <path
            d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" aria-hidden>
          <rect x="2.5" y="4.5" width="19" height="13" rx="2" strokeWidth="1.6" />
          <path d="M8 20.5h8" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
