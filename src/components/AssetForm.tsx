'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parsePriceToCents, formatPriceFull } from '@/lib/format'
import { SECTORS } from '@/lib/types'
import { AssetCard } from '@/components/AssetCard'
import type { Asset } from '@/lib/types'

// One form, two jobs: publishing a listing and correcting one.
//
// It used to be insert-only, which meant a typo in the asking price of a licensed entity could
// never be fixed — the seller's only recourse was to unpublish and start again. The insert and
// the update differ by one call, so a second component would have been two copies of twelve
// fields drifting apart.
//
// Fields are controlled rather than read out of FormData on submit, because the preview beside
// them has to be live. That is the point of the preview: a listing is what a buyer sees, and
// seeing it while typing catches the wrong sector or an unreadable price before publication
// rather than after.

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </label>
  )
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-surface p-5">
      <legend className="px-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
        {title}
      </legend>
      {note && <p className="mb-4 text-xs text-faint">{note}</p>}
      <div className="grid gap-4">{children}</div>
    </fieldset>
  )
}

const input = 'rounded-lg border bg-field px-3 py-2 text-sm'

type Values = {
  title: string
  description: string
  country: string
  sector: string
  license_type: string
  regulator: string
  asset_kind: string
  business_state: string
  year_of_issue: string
  employees: string
  price: string
  included_activities: string
  status: string
}

const BLANK: Values = {
  title: '',
  description: '',
  country: '',
  sector: 'Payment',
  license_type: '',
  regulator: '',
  asset_kind: 'LICENSE_ONLY',
  business_state: 'NOT_ACTIVE',
  year_of_issue: '',
  employees: '',
  price: '',
  included_activities: '',
  status: 'PUBLISHED',
}

function fromAsset(a: Asset): Values {
  return {
    title: a.title,
    description: a.description ?? '',
    country: a.country,
    sector: a.sector,
    license_type: a.license_type,
    regulator: a.regulator ?? '',
    asset_kind: a.asset_kind,
    business_state: a.business_state,
    year_of_issue: a.year_of_issue?.toString() ?? '',
    employees: a.employees?.toString() ?? '',
    price: (a.asking_price_cents / 100).toString(),
    included_activities: a.included_activities.join(', '),
    status: a.status,
  }
}

export function AssetForm({ sellerId, asset }: { sellerId: string; asset?: Asset }) {
  const router = useRouter()
  const [v, setV] = useState<Values>(asset ? fromAsset(asset) : BLANK)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof Values>(k: K) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }))

  // The price field accepts what people actually type — "2.5M", "40k", "1 200 000" — and is
  // echoed back parsed, so a typo is visible before the listing goes live rather than after a
  // buyer sees the wrong number.
  const priceCents = parsePriceToCents(v.price)

  const activities = v.included_activities
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (priceCents === null) {
      setError('The asking price could not be read. Try 2.5M, 400K or 40000.')
      return
    }
    setBusy(true)
    setError(null)

    const row = {
      title: v.title.trim(),
      description: v.description.trim() || null,
      country: v.country.trim(),
      sector: v.sector,
      license_type: v.license_type.trim(),
      regulator: v.regulator.trim() || null,
      asset_kind: v.asset_kind,
      business_state: v.business_state,
      year_of_issue: v.year_of_issue ? Number(v.year_of_issue) : null,
      employees: v.employees ? Number(v.employees) : null,
      asking_price_cents: priceCents,
      included_activities: activities,
      status: v.status,
    }

    const supabase = createClient()

    if (asset) {
      // No seller_id in the update. RLS already pins the row to its owner, and sending the
      // column would let a rewritten request try to hand the listing to someone else.
      const { error } = await supabase.from('assets').update(row).eq('id', asset.id)
      setBusy(false)
      if (error) return setError(error.message)
      router.push(`/assets/${asset.id}`)
      router.refresh()
      return
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({ ...row, seller_id: sellerId })
      .select('id')
      .single<{ id: string }>()

    setBusy(false)
    if (error) return setError(error.message)
    router.push(`/assets/${data.id}`)
    router.refresh()
  }

  // A plausible row for the preview. The id and the counters are placeholders; nothing here is
  // written anywhere, it exists only to be rendered by the same card a buyer will see.
  const preview: Asset = {
    id: asset?.id ?? 'preview',
    seller_id: sellerId,
    public_id: asset?.public_id ?? 0,
    title: v.title || 'Untitled listing',
    description: v.description || null,
    country: v.country || 'Country',
    sector: v.sector,
    license_type: v.license_type || '—',
    regulator: v.regulator || null,
    asset_kind: v.asset_kind as Asset['asset_kind'],
    business_state: v.business_state as Asset['business_state'],
    year_of_issue: v.year_of_issue ? Number(v.year_of_issue) : null,
    employees: v.employees ? Number(v.employees) : null,
    asking_price_cents: priceCents ?? 0,
    included_activities: activities,
    status: v.status as Asset['status'],
    validated: asset?.validated ?? false,
    views: asset?.views ?? 0,
    created_at: asset?.created_at ?? new Date().toISOString(),
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <form onSubmit={submit} className="grid gap-5">
        <Group title="What it is">
          <Field label="Title">
            <input
              required
              value={v.title}
              onChange={set('title')}
              className={input}
              placeholder="Lithuanian EMI with SEPA access"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={v.description}
              onChange={set('description')}
              className={input}
              placeholder="What a buyer gets, in plain terms."
            />
          </Field>
        </Group>

        <Group title="The licence" note="What a buyer filters on first.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country">
              <input
                required
                value={v.country}
                onChange={set('country')}
                className={input}
                placeholder="Lithuania"
              />
            </Field>
            <Field label="Sector">
              <select required value={v.sector} onChange={set('sector')} className={input}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type of licence">
              <input
                required
                value={v.license_type}
                onChange={set('license_type')}
                className={input}
                placeholder="EMI"
              />
            </Field>
            <Field label="Regulator">
              <input
                value={v.regulator}
                onChange={set('regulator')}
                className={input}
                placeholder="Bank of Lithuania"
              />
            </Field>
          </div>
          <Field label="Included activities" hint="Comma separated.">
            <input
              value={v.included_activities}
              onChange={set('included_activities')}
              className={input}
              placeholder="E-Money Issuance, SEPA, IBAN Issuing"
            />
          </Field>
        </Group>

        <Group title="The business">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Asset type">
              <select required value={v.asset_kind} onChange={set('asset_kind')} className={input}>
                <option value="LICENSE_ONLY">Licence only</option>
                <option value="ACTIVE_BUSINESS">Active business</option>
              </select>
            </Field>
            <Field label="Business status">
              <select
                required
                value={v.business_state}
                onChange={set('business_state')}
                className={input}
              >
                <option value="NOT_ACTIVE">Not active</option>
                <option value="ACTIVE">Active</option>
              </select>
            </Field>
            <Field label="Year of issue">
              <input
                type="number"
                min={1990}
                max={2100}
                value={v.year_of_issue}
                onChange={set('year_of_issue')}
                className={input}
              />
            </Field>
            <Field label="Employees">
              <input
                type="number"
                min={0}
                value={v.employees}
                onChange={set('employees')}
                className={input}
              />
            </Field>
          </div>
        </Group>

        <Group title="Price and publication">
          <Field
            label="Asking price"
            hint={
              v.price
                ? priceCents === null
                  ? 'Could not read this as a price.'
                  : `Will be stored as ${formatPriceFull(priceCents)}`
                : 'Accepts 2.5M, 400K or 40000.'
            }
          >
            <input
              required
              value={v.price}
              onChange={set('price')}
              className={input}
              placeholder="2.5M"
            />
          </Field>

          <Field
            label="Publish state"
            hint={
              v.status === 'DRAFT'
                ? 'Only you and a platform manager can see a draft.'
                : 'Visible to every active buyer.'
            }
          >
            <select value={v.status} onChange={set('status')} className={input}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </Field>
        </Group>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            disabled={busy}
            className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Saving…' : asset ? 'Save changes' : 'Publish listing'}
          </button>
          <a
            href={asset ? `/assets/${asset.id}` : '/seller/assets'}
            className="text-sm text-muted transition hover:text-fg"
          >
            Cancel
          </a>
        </div>
      </form>

      <div className="lg:sticky lg:top-20">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          What a buyer will see
        </p>
        <AssetCard asset={preview} showStatus linked={false} peersCents={[]} />
      </div>
    </div>
  )
}
