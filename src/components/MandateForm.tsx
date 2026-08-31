'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTORS, type BuyerProfile, type Profile } from '@/lib/types'

const input = 'rounded-lg border bg-field px-3 py-2 text-sm'

export function MandateForm({
  profile,
  mandate,
}: {
  profile: Profile
  mandate: BuyerProfile | null
}) {
  const userId = profile.id
  const router = useRouter()
  const [sectors, setSectors] = useState<string[]>(mandate?.sectors ?? [])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleSector(s: string) {
    setSectors((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)

    const form = new FormData(e.currentTarget)
    const get = (k: string) => String(form.get(k) ?? '').trim()
    const num = (k: string) => (get(k) ? Number(get(k)) : null)

    const supabase = createClient()

    // The assignment asks a buyer to 'create and maintain their profile' as well as describe
    // their interests. Those are two tables, so this is two writes: identity on profiles,
    // mandate on buyer_profiles. The identity write goes first — if it fails, the mandate is
    // not saved either, and the user is not left believing both landed.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: get('full_name'), company: get('company') || null })
      .eq('id', userId)

    if (profileError) {
      setBusy(false)
      setError(profileError.message)
      return
    }

    // Upsert, because a buyer may not have a mandate row yet. The primary key is user_id,
    // so this is a single round trip either way.
    const { error } = await supabase.from('buyer_profiles').upsert({
      user_id: userId,
      headline: get('headline') || null,
      description: get('description') || null,
      sectors,
      jurisdictions: get('jurisdictions')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ticket_min_eur: num('ticket_min_eur'),
      ticket_max_eur: num('ticket_max_eur'),
      updated_at: new Date().toISOString(),
    })

    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <fieldset className="grid gap-4">
        <legend className="mb-2 text-sm font-medium">Who you are</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">Full name</span>
            <input name="full_name" required defaultValue={profile.full_name} className={input} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">Company</span>
            <input name="company" defaultValue={profile.company ?? ''} className={input} placeholder="Harbour Capital" />
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-sm font-medium">What you are looking for</legend>
      <label className="grid gap-1.5">
        <span className="text-xs text-muted">Headline</span>
        <input
          name="headline"
          defaultValue={mandate?.headline ?? ''}
          className={input}
          placeholder="Payments and EMI across the EEA"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs text-muted">What you are looking for</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={mandate?.description ?? ''}
          className={input}
          placeholder="Hard requirements first — a seller reads this to decide whether to approach you."
        />
      </label>

      <div className="grid gap-1.5">
        <span className="text-xs text-muted">Sectors</span>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSector(s)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                sectors.includes(s) ? 'border-accent-text text-accent-text' : 'text-muted hover:text-fg'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-faint">
          Leave all unselected to see every sector.
        </span>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs text-muted">Jurisdictions</span>
        <input
          name="jurisdictions"
          defaultValue={mandate?.jurisdictions.join(', ') ?? ''}
          className={input}
          placeholder="Lithuania, Ireland, Netherlands"
        />
        <span className="text-[11px] text-faint">Comma separated. Empty means anywhere.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs text-muted">Ticket from, EUR</span>
          <input
            name="ticket_min_eur"
            type="number"
            min={0}
            defaultValue={mandate?.ticket_min_eur ?? ''}
            className={input}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs text-muted">Ticket up to, EUR</span>
          <input
            name="ticket_max_eur"
            type="number"
            min={0}
            defaultValue={mandate?.ticket_max_eur ?? ''}
            className={input}
          />
        </label>
      </div>
      </fieldset>

      {error && (
        <p className="rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-sm text-ok">Saved.</span>}
      </div>
    </form>
  )
}
