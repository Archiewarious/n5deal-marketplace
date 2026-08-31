import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPriceFull } from '@/lib/format'
import { CountryTag } from '@/components/CountryTag'
import { sectorTone } from '@/lib/sector'
import { Reveal } from '@/components/Reveal'
import { CountUp } from '@/components/CountUp'
import { RoleCards } from '@/components/RoleCards'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('meta.home') }
}

type Stats = {
  listings: number
  jurisdictions: number
  participants: number
  value_cents: number
  by_country: { country: string; n: number }[]
  by_sector: { sector: string; n: number }[]
}

export default async function Home() {
  // The one call an anonymous visitor may make. `platform_stats` is a security definer function
  // returning aggregates and nothing else (see supabase/04_public_stats.sql): the tables behind
  // it stay closed, because the audit found the participant directory readable by anyone holding
  // the publishable key. If the function is not deployed the page still renders; the register
  // simply has nothing to count, which is better than a crash on the front page.
  const t = await getT()
  const tag = intlTag(await getLocale())
  const supabase = await createClient()
  const { data } = await supabase.rpc('platform_stats')
  const stats = (data as Stats | null) ?? null

  const sectorMax = Math.max(1, ...(stats?.by_sector ?? []).map((s) => s.n))

  return (
    <main id="content" className="flex-1">
      {/* ── The register ─────────────────────────────────────────────────────────
          A licence is a document with a jurisdiction, a regulator and a number, and the trade in
          them runs off a register. So the page opens as one rather than as a headline over a
          hero image: mono column heads, hairline rules, the actual inventory underneath. Every
          figure comes from the database. */}
      <section className="relative overflow-hidden border-b px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--wash)' }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <p className="rise flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            <span className="size-1.5 rounded-full bg-seller" />
            {t('home.eyebrow')}
          </p>

          <h1
            className="rise mt-5 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            {t('home.h1a')}
            <br className="hidden sm:block" /> {t('home.h1b')}{' '}
            <span className="text-accent-text">{t('home.h1accent')}</span>.
          </h1>

          <p
            className="rise mt-6 max-w-2xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: '120ms' }}
          >
            {t('home.lede')}
          </p>

          <div
            className="rise mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '180ms' }}
          >
            <Link
              href="/login"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-fg transition hover:opacity-90"
            >
              {t('home.enter')}
            </Link>
            <a
              href="https://github.com/Archiewarious/n5deal-marketplace"
              className="rounded-full border px-6 py-2.5 text-sm text-muted transition hover:text-fg"
            >
              {t('home.source')}
            </a>
          </div>

          {/* The inventory as a shape. Country codes in mono because that is how a register
              writes a jurisdiction, and because a column of them lines up. */}
          {stats && stats.by_country.length > 0 && (
            <div
              className="rise mt-14 overflow-hidden rounded-2xl border bg-surface/70 backdrop-blur"
              style={{ animationDelay: '240ms' }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
                  {t('home.registerTitle')}
                </p>
                <p className="font-mono text-[11px] text-faint">{t('home.registerNote')}</p>
              </div>

              {/* The figures count up once, when the band scrolls into view. Nothing about the
                  number is invented — the target is the real aggregate — the animation only
                  decides how the eye arrives at it, and a figure that climbs reads as a market
                  where one already at rest reads as a fact. */}
              <dl className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  { k: 'home.listings', n: stats.listings, money: false },
                  { k: 'home.jurisdictions', n: stats.jurisdictions, money: false },
                  { k: 'home.participants', n: stats.participants, money: false },
                  { k: 'home.valueListed', n: stats.value_cents, money: true },
                ].map((s) => (
                  <div key={s.k} className="border-b px-5 py-4 sm:border-b-0 sm:not-first:border-l">
                    <dt className="text-[10px] uppercase tracking-wider text-faint">{t(s.k)}</dt>
                    <dd className="mt-1 font-mono text-2xl font-medium tabular-nums">
                      <CountUp value={s.n} money={s.money} tag={tag} />
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t px-5 py-4">
                {stats.by_country.map((c) => (
                  <span key={c.country} className="flex items-center gap-1.5 text-sm">
                    <CountryTag country={c.country} />
                    <span className="font-mono tabular-nums text-faint">{c.n}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── What is in it ───────────────────────────────────────────────────────── */}
      {stats && stats.by_sector.length > 0 && (
        <Reveal><section className="border-b px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t('home.shelfTitle')}</h2>
              <p className="mt-3 max-w-md leading-relaxed text-muted">
                {t('home.shelfBody')}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-text transition-all hover:gap-2.5"
              >
                {t('home.browse')} <span aria-hidden>→</span>
              </Link>
            </div>

            <ul className="space-y-3">
              {stats.by_sector.map((s) => {
                const tone = sectorTone(s.sector)
                return (
                  <li key={s.sector} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3">
                    <span className={`truncate text-sm ${tone.text}`}>{s.sector}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-field">
                      <span
                        className={`block h-full rounded-full ${tone.dot}`}
                        style={{ width: `${(s.n / sectorMax) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-mono text-sm tabular-nums text-muted">
                      {s.n}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section></Reveal>
      )}

      {/* ── The three sides ─────────────────────────────────────────────────────── */}
      <Reveal><section className="border-b px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t('home.sidesTitle')}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            {t('home.sidesBody')}
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-line md:grid-cols-3">
            {[
              {
                tone: 'text-seller',
                title: 'role.seller',
                sees: 'home.sellerSees',
                does: 'home.sellerDoes',
              },
              {
                tone: 'text-buyer',
                title: 'role.buyer',
                sees: 'home.buyerSees',
                does: 'home.buyerDoes',
              },
              {
                tone: 'text-manager',
                title: 'role.manager',
                sees: 'home.managerSees',
                does: 'home.managerDoes',
              },
            ].map((c) => (
              <div key={c.title} className="bg-surface p-6">
                <p className={`font-mono text-xs uppercase tracking-[0.16em] ${c.tone}`}>
                  {t(c.title)}
                </p>
                <p className="mt-4 text-sm leading-relaxed">
                  <span className="text-faint">{t('home.sees')} </span>
                  <span className="text-muted">{t(c.sees)}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="text-faint">{t('home.does')} </span>
                  <span className="text-muted">{t(c.does)}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section></Reveal>

      {/* ── Why the boundary holds ──────────────────────────────────────────────── */}
      <Reveal><section className="border-b px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t('home.rulesTitle')}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              {t('home.rulesBody1')}
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              {t('home.rulesBody2')}
            </p>
            <a
              href="https://github.com/Archiewarious/n5deal-marketplace/blob/master/supabase/SECURITY.md"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-text transition-all hover:gap-2.5"
            >
              {t('home.readAudit')} <span aria-hidden>→</span>
            </a>
          </div>

          <ul className="grid gap-px overflow-hidden rounded-2xl border bg-line">
            {[
              ['home.rule1who', 'home.rule1what'],
              ['home.rule2who', 'home.rule2what'],
              ['home.rule3who', 'home.rule3what'],
              ['home.rule4who', 'home.rule4what'],
              ['home.rule5who', 'home.rule5what'],
              ['home.rule6who', 'home.rule6what'],
            ].map(([who, what]) => (
              <li key={who} className="flex flex-wrap gap-x-2 bg-surface px-5 py-3.5 text-sm">
                <span className="font-mono text-faint">{t(who)}</span>
                <span className="text-muted">{t(what)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section></Reveal>

      {/* ── Enter ───────────────────────────────────────────────────────────────── */}
      <Reveal><section id="roles" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-9 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('home.pickTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              {t('home.pickBody')}
            </p>
          </div>

          <RoleCards showExtras={false} />

          <p className="mt-8 text-center text-sm text-muted">
            {t('home.fourth')}{' '}
            <Link href="/login" className="text-accent-text hover:underline">
              {t('home.rolePicker')}
            </Link>{' '}
            — {t('home.fourthTail')}
          </p>
        </div>
      </section></Reveal>
    </main>
  )
}
