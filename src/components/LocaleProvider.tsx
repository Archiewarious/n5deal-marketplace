'use client'

import { createContext, useContext } from 'react'
import { translator, type Locale, type T } from '@/lib/i18n'

// Client components cannot read the cookie the way a server component can, so the locale is
// handed down once from the root layout and the same dictionary function is built on this side.
// One context, no fetching, no flash of English.
const Ctx = createContext<Locale>('en')

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>
}

export function useLocale(): Locale {
  return useContext(Ctx)
}

export function useT(): T {
  return translator(useContext(Ctx))
}
