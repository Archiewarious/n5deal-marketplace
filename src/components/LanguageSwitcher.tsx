'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/LocaleProvider'
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, LOCALE_SHORT, type Locale } from '@/lib/i18n'

// A cookie and a refresh. The locale is not in the URL (see the note in lib/i18n.ts), so nothing
// about the current page changes except which dictionary the next render reads — a filtered
// catalogue stays filtered, a half-written form stays where it is on the server round trip.
export function LanguageSwitcher() {
  const router = useRouter()
  const locale = useLocale()

  function set(next: Locale) {
    // A year, path-wide, Lax: this is a display preference, not a credential.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <select
      value={locale}
      onChange={(e) => set(e.target.value as Locale)}
      aria-label="Language"
      title={LOCALE_NAMES[locale]}
      className="h-8 shrink-0 rounded-full border bg-transparent px-2 font-mono text-xs text-muted transition hover:text-fg"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_SHORT[l]}
        </option>
      ))}
    </select>
  )
}
