import Link from 'next/link'
import { RoleCards } from '@/components/RoleCards'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { CountryTag } from '@/components/CountryTag'
import { createClient } from '@/lib/supabase/server'
import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('meta.login') }
}

type Stats = {
  listings: number
  jurisdictions: number
  participants: number
  value_cents: number
  by_country: { country: string; n: number }[]
}

// The front door, not a login form. The cards themselves live in RoleCards, because the landing
// page ends with the same three and there is no reason for two copies of them to drift apart.
export default async function LoginPage() {
  const t = await getT()
  const tag = intlTag(await getLocale())

  // The same aggregate the landing page reads, and the same reason: this screen asks a visitor
  // to pick a side of a marketplace while telling them nothing about what is in it. `platform_stats`
  // is the one call an anonymous session may make (supabase/04_public_stats.sql), so the numbers
  // here are the real catalogue rather than copy.
  const supabase = await createClient()
  const { data } = await supabase.rpc('platform_stats')
  const stats = (data as Stats | null) ?? null

  const money = new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  return (
    <main
      id="content"
      className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 py-12 sm:px-6"
    >
      {/* One quiet pool of the accent behind the cards. The palette is deliberately flat, so
          this is depth rather than a glow: enough to keep the three cards off a dead ground,
          not enough to be noticed as an effect. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--wash)' }}
      />

      {/* Both public screens carry these. The switcher used to live only in TopNav, so a
          first-time visitor met the product in a language they had no way to change. */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <header className="rise mb-9 text-center">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur transition hover:text-fg"
          >
            <span className="size-1.5 rounded-full bg-seller" />
            {t('login.about')}
          </Link>
          <h1 className="display mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] sm:text-5xl">
            {t('login.h1a')} <span className="text-accent-text">{t('login.h1accent')}</span>{' '}
            {t('login.h1b')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">{t('login.lede')}</p>

          {/* Three figures and the jurisdictions, in the mono the rest of the register is set
              in. It answers "what is in here" before the visitor is asked to pick a side, and it
              fills a band that was otherwise empty down to the footer. */}
          {stats && (
            <div className="mt-7 flex flex-col items-center gap-3">
              <dl className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-sm">
                {[
                  { k: 'home.listings', v: String(stats.listings) },
                  { k: 'home.jurisdictions', v: String(stats.jurisdictions) },
                  { k: 'login.onPlatform', v: money.format(stats.value_cents / 100) },
                ].map((s) => (
                  <div key={s.k} className="flex items-baseline gap-2">
                    <dd className="tabular-nums">{s.v}</dd>
                    <dt className="text-[11px] uppercase tracking-wider text-faint">{t(s.k)}</dt>
                  </div>
                ))}
              </dl>

              {stats.by_country.length > 0 && (
                <div className="flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-2">
                  {stats.by_country.map((c) => (
                    <CountryTag key={c.country} country={c.country} />
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        <RoleCards />
      </div>
    </main>
  )
}
