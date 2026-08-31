import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { getT } from '@/lib/locale'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { matchAssetToBuyer } from '@/lib/matching'
import { formatPriceShort } from '@/lib/format'
import { TopNav } from '@/components/TopNav'
import { ContactForm } from '@/components/ContactForm'
import type { Asset, BuyerProfile, Profile } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getT()
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('company, full_name')
    .eq('id', id)
    .maybeSingle<{ company: string | null; full_name: string }>()
  return { title: data ? (data.company ?? data.full_name) : t('meta.buyer') }
}

export default async function BuyerPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('SELLER', 'MANAGER')
  const t = await getT()
  const { id } = await params
  const supabase = await createClient()

  const { data: person } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle<Profile>()
  if (!person) notFound()

  const { data: mandate } = await supabase
    .from('buyer_profiles')
    .select('*')
    .eq('user_id', id)
    .maybeSingle<BuyerProfile>()

  // For a seller: which of my own listings this buyer would plausibly want.
  let suggestions: { asset: Asset; score: number }[] = []
  if (mandate && profile.role === 'SELLER') {
    const { data: mine } = await fetchAllRows<Asset>((from, to) =>
      supabase
        .from('assets')
        .select('*')
        .eq('seller_id', profile.id)
        .eq('status', 'PUBLISHED')
        .range(from, to),
    )
    suggestions = mine
      .map((asset) => ({ asset, score: matchAssetToBuyer(asset, mandate).score }))
      .filter((s): s is { asset: Asset; score: number } => (s.score ?? 0) > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <Link href="/buyers" className="text-xs text-faint transition hover:text-fg">
          ← {t('buyers.allBuyers')}
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-semibold">{person.company ?? person.full_name}</h1>
          <p className="mt-1 text-sm text-muted">
            {person.full_name}
            {person.status === 'SUSPENDED' && (
              <span className="ml-2 rounded-full bg-danger-bg px-2 py-0.5 text-[10px] text-danger">
                {t('nav.suspended')}
              </span>
            )}
          </p>
        </div>

        {mandate ? (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <h2 className="mb-1 text-base font-medium">{mandate.headline}</h2>
            {mandate.description && (
              <p className="mb-4 text-sm text-muted">{mandate.description}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">
                  {t('mandate.sectors')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mandate.sectors.map((s) => (
                    <span key={s} className="rounded-full border px-2.5 py-1 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">
                  {t('mandate.jurisdictions')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mandate.jurisdictions.map((j) => (
                    <span key={j} className="rounded-full bg-elevated px-2.5 py-1 text-xs">
                      {j}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">
                  {t('buyers.ticket')}
                </p>
                <p className="text-sm">
                  {mandate.ticket_min_eur !== null && `€${mandate.ticket_min_eur.toLocaleString()}`}
                  {mandate.ticket_min_eur !== null && mandate.ticket_max_eur !== null && ' – '}
                  {mandate.ticket_max_eur !== null && `€${mandate.ticket_max_eur.toLocaleString()}`}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <p className="mb-6 rounded-xl border bg-surface px-5 py-6 text-sm text-muted">
            {t('buyers.noMandateYet')}
          </p>
        )}

        {suggestions.length > 0 && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <h2 className="mb-3 text-sm font-medium">{t('buyers.suggestions')}</h2>
            <ul className="grid gap-2">
              {suggestions.map(({ asset, score }) => (
                <li key={asset.id} className="flex items-center justify-between gap-3">
                  <Link href={`/assets/${asset.id}`} className="truncate text-sm hover:text-accent-text">
                    {asset.title}
                  </Link>
                  <span className="shrink-0 text-xs text-faint">
                    {formatPriceShort(asset.asking_price_cents)} ·{' '}
                    <span className="text-accent-text">{score}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ContactForm
          toUserId={person.id}
          toName={person.company ?? person.full_name}
          disabled={profile.status === 'SUSPENDED'}
        />
      </main>
    </>
  )
}
