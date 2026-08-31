import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { TopNav } from '@/components/TopNav'
import type { Asset, ContactRequest, Profile } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'

export default async function MessagesPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // No filter on from/to: the RLS policy already limits this to messages the caller is a
  // party to — or everything, if the caller is a manager. Writing the filter here as well
  // would silently break the manager's view.
  const { data: messages, error: messagesError } = await fetchAllRows<ContactRequest>((from, to) =>
    supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to),
  )

  const { data: people } = await fetchAllRows<Profile>((from, to) =>
    supabase.from('profiles').select('*').range(from, to),
  )
  // Only the three fields a message row needs to render its link.
  type AssetRef = Pick<Asset, 'id' | 'title' | 'public_id'>
  const { data: assets } = await fetchAllRows<AssetRef>((from, to) =>
    supabase.from('assets').select('id,title,public_id').range(from, to).overrideTypes<AssetRef[]>(),
  )

  const person = new Map(people.map((p) => [p.id, p]))
  const asset = new Map(assets.map((a) => [a.id, a]))
  const name = (id: string) => {
    const p = person.get(id)
    return p ? (p.company ?? p.full_name) : 'Unknown'
  }

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <p className="text-xs text-faint">N5Deal / Messages</p>
        <h1 className="mb-1 text-xl font-semibold">
          {profile.role === 'MANAGER' ? 'All contact requests' : 'Your contact requests'}
        </h1>
        <p className="mb-6 text-sm text-muted">
          {profile.role === 'MANAGER'
            ? 'Every message exchanged on the platform.'
            : 'Messages you sent and received.'}
        </p>

        <LoadWarning what="Your messages" error={messagesError} />

        <div className="grid gap-3">
          {messages.map((m) => {
            const outgoing = m.from_user_id === profile.id
            const linked = m.asset_id ? asset.get(m.asset_id) : null
            return (
              <article key={m.id} className="rounded-xl border bg-surface p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      outgoing ? 'bg-elevated text-muted' : 'bg-ok-bg text-ok'
                    }`}
                  >
                    {outgoing ? 'sent' : 'received'}
                  </span>
                  <span className="text-muted">
                    {name(m.from_user_id)} → {name(m.to_user_id)}
                  </span>
                  <span className="text-faint">
                    {new Date(m.created_at).toLocaleString('en-GB')}
                  </span>
                </div>

                {linked && (
                  <Link
                    href={`/assets/${linked.id}`}
                    className="mb-2 inline-block text-sm text-accent-text hover:underline"
                  >
                    #{linked.public_id} {linked.title}
                  </Link>
                )}

                <p className="text-sm text-muted">{m.message}</p>
              </article>
            )
          })}
          {messages.length === 0 && (
            <p className="rounded-xl border bg-surface px-5 py-8 text-center text-sm text-muted">
              No messages yet. Open a listing and contact the seller to start one.
            </p>
          )}
        </div>
      </main>
    </>
  )
}
