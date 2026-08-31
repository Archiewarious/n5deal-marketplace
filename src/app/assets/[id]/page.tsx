import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { formatPriceFull, formatDate } from '@/lib/format'
import { matchAssetToBuyer } from '@/lib/matching'
import { TopNav } from '@/components/TopNav'
import { ContactForm } from '@/components/ContactForm'
import type { Asset, BuyerProfile, Profile } from '@/lib/types'

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border bg-field px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-faint">{label}</p>
      <p className="text-sm">{value ?? 'N/A'}</p>
    </div>
  )
}

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile()
  const { id } = await params
  const supabase = await createClient()

  // No status filter here on purpose: RLS decides what this user may see. A seller can
  // open their own draft through this page, a manager can open anything, and anyone else
  // gets a 404 rather than a permission error — the row simply does not exist for them.
  const { data: asset } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .maybeSingle<Asset>()

  if (!asset) notFound()

  const { data: seller } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', asset.seller_id)
    .maybeSingle<Profile>()

  let match: ReturnType<typeof matchAssetToBuyer> | null = null
  if (profile.role === 'BUYER') {
    const { data: mandate } = await supabase
      .from('buyer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle<BuyerProfile>()
    if (mandate) match = matchAssetToBuyer(asset, mandate)
  }

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <Link href="/assets" className="text-xs text-faint transition hover:text-fg">
          ← All listings
        </Link>

        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs text-faint">Asset ID #{asset.public_id}</p>
              {asset.validated && (
                <span className="rounded-full bg-ok-bg px-2 py-0.5 text-[10px] text-ok">
                  Validated
                </span>
              )}
              {asset.status !== 'PUBLISHED' && (
                <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[10px] text-warn">
                  {asset.status.toLowerCase()}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold">{asset.title}</h1>
            {seller && (
              <p className="mt-1 text-sm text-muted">
                Listed by {seller.company ?? seller.full_name} · {formatDate(asset.created_at)}
              </p>
            )}
          </div>

          <div className="rounded-xl border px-5 py-3 text-right">
            <p className="text-[10px] uppercase tracking-wider text-faint">Asking price</p>
            <p className="text-2xl font-semibold">
              {formatPriceFull(asset.asking_price_cents)}
            </p>
          </div>
        </div>

        {match && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full border border-accent px-3 py-1 text-sm text-accent">
                {match.score}% match
              </span>
              <p className="text-sm text-muted">against your mandate</p>
            </div>
            <ul className="grid gap-1 text-sm">
              {match.reasons.map((r) => (
                <li key={r.label} className={r.hit ? 'text-ok' : 'text-faint'}>
                  {r.hit ? '✓' : '✗'} {r.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Country" value={asset.country} />
          <Field label="Type of licence" value={asset.license_type} />
          <Field label="Type of business" value={asset.sector} />
          <Field
            label="Business status"
            value={asset.business_state === 'ACTIVE' ? 'Active' : 'Not active'}
          />
          <Field
            label="Asset type"
            value={asset.asset_kind === 'LICENSE_ONLY' ? 'Licence only' : 'Active business'}
          />
          <Field label="Employees" value={asset.employees} />
          <Field label="Year of issue" value={asset.year_of_issue} />
          <Field label="Regulatory" value={asset.regulator} />
        </section>

        {asset.included_activities.length > 0 && (
          <section className="mb-6">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-faint">Included</p>
            <div className="flex flex-wrap gap-2">
              {asset.included_activities.map((a) => (
                <span key={a} className="rounded-full border px-3 py-1 text-sm text-muted">
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {asset.description && (
          <section className="mb-6 rounded-xl border bg-surface p-5">
            <p className="text-sm leading-relaxed text-muted">{asset.description}</p>
          </section>
        )}

        {seller && profile.id !== seller.id && (
          <ContactForm
            toUserId={seller.id}
            toName={seller.company ?? seller.full_name}
            assetId={asset.id}
            disabled={profile.status === 'SUSPENDED'}
          />
        )}
      </main>
    </>
  )
}
