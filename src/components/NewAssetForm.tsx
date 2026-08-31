'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parsePriceToCents, formatPriceFull } from '@/lib/format'
import { SECTORS } from '@/lib/types'

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

const input = 'rounded-lg border bg-field px-3 py-2 text-sm'

export function NewAssetForm({ sellerId }: { sellerId: string }) {
  const router = useRouter()
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The price field accepts what people actually type — "2.5M", "40k", "1 200 000" —
  // and is echoed back parsed, so a typo is visible before the listing goes live rather
  // than after a buyer sees the wrong number.
  const priceCents = parsePriceToCents(price)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (priceCents === null) {
      setError('The asking price could not be read. Try 2.5M, 400K or 40000.')
      return
    }
    setBusy(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const get = (k: string) => String(form.get(k) ?? '').trim()
    const activities = get('included_activities')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('assets')
      .insert({
        seller_id: sellerId,
        title: get('title'),
        description: get('description') || null,
        country: get('country'),
        sector: get('sector'),
        license_type: get('license_type'),
        regulator: get('regulator') || null,
        asset_kind: get('asset_kind'),
        business_state: get('business_state'),
        year_of_issue: get('year_of_issue') ? Number(get('year_of_issue')) : null,
        employees: get('employees') ? Number(get('employees')) : null,
        asking_price_cents: priceCents,
        included_activities: activities,
        status: get('status'),
      })
      .select('id')
      .single<{ id: string }>()

    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push(`/assets/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Title">
        <input name="title" required className={input} placeholder="Lithuanian EMI with SEPA access" />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          className={input}
          placeholder="What a buyer gets, in plain terms."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country">
          <input name="country" required className={input} placeholder="Lithuania" />
        </Field>
        <Field label="Sector">
          <select name="sector" required className={input} defaultValue="Payment">
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type of licence">
          <input name="license_type" required className={input} placeholder="EMI" />
        </Field>
        <Field label="Regulator">
          <input name="regulator" className={input} placeholder="Bank of Lithuania" />
        </Field>
        <Field label="Asset type">
          <select name="asset_kind" required className={input} defaultValue="LICENSE_ONLY">
            <option value="LICENSE_ONLY">Licence only</option>
            <option value="ACTIVE_BUSINESS">Active business</option>
          </select>
        </Field>
        <Field label="Business status">
          <select name="business_state" required className={input} defaultValue="NOT_ACTIVE">
            <option value="NOT_ACTIVE">Not active</option>
            <option value="ACTIVE">Active</option>
          </select>
        </Field>
        <Field label="Year of issue">
          <input name="year_of_issue" type="number" min={1990} max={2100} className={input} />
        </Field>
        <Field label="Employees">
          <input name="employees" type="number" min={0} className={input} />
        </Field>
      </div>

      <Field
        label="Asking price"
        hint={
          price
            ? priceCents === null
              ? 'Could not read this as a price.'
              : `Will be stored as ${formatPriceFull(priceCents)}`
            : 'Accepts 2.5M, 400K or 40000.'
        }
      >
        <input
          name="asking_price"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={input}
          placeholder="2.5M"
        />
      </Field>

      <Field label="Included activities" hint="Comma separated.">
        <input
          name="included_activities"
          className={input}
          placeholder="E-Money Issuance, SEPA, IBAN Issuing"
        />
      </Field>

      <Field label="Publish state">
        <select name="status" className={input} defaultValue="PUBLISHED">
          <option value="PUBLISHED">Publish now</option>
          <option value="DRAFT">Save as draft</option>
        </select>
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div>
        <button
          disabled={busy}
          className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save listing'}
        </button>
      </div>
    </form>
  )
}
