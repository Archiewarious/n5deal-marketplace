import 'server-only'
import { cookies } from 'next/headers'
import { LOCALE_COOKIE, isLocale, translator, type Locale, type T } from './i18n'

/**
 * The locale for this request, from the cookie the switcher sets.
 *
 * Server-only because it reaches for `next/headers`. Client components get the locale through
 * LocaleProvider instead, which the root layout fills from this.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const v = store.get(LOCALE_COOKIE)?.value
  return isLocale(v) ? v : 'en'
}

/** The translator for this request. Every server component calls this and nothing else. */
export async function getT(): Promise<T> {
  return translator(await getLocale())
}
