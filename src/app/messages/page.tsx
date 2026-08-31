import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { getLocale, getT } from '@/lib/locale'
import { intlTag } from '@/lib/i18n'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { TopNav } from '@/components/TopNav'
import { ContactForm } from '@/components/ContactForm'
import type { Asset, ContactRequest, Profile } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('nav.messages') }
}

const ROLE_TONE: Record<Profile['role'], string> = {
  SELLER: 'bg-seller-bg text-seller',
  BUYER: 'bg-buyer-bg text-buyer',
  MANAGER: 'bg-manager-bg text-manager',
}

const ROLE_KEY: Record<Profile['role'], string> = {
  SELLER: 'role.seller',
  BUYER: 'role.buyer',
  MANAGER: 'role.managerShort',
}

export default async function MessagesPage() {
  const profile = await requireProfile()
  const t = await getT()
  // A timestamp is interface, not data: a Ukrainian conversation should not be dated in English.
  const tag = intlTag(await getLocale())
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
    return p ? (p.company ?? p.full_name) : t('messages.unknownParty')
  }

  const suspended = profile.status === 'SUSPENDED'

  // Grouped by counterparty for the two sides of a deal, flat for a manager.
  //
  // A participant has conversations: the useful unit is "everything between me and Harbour
  // Capital", with a reply box at the end of it. A manager is a party to none of these, so
  // grouping them by counterparty would mean grouping by someone who is not them — they get the
  // log, which is what moderation actually needs.
  const threads = new Map<string, ContactRequest[]>()
  if (profile.role !== 'MANAGER') {
    // The query returns newest first; a conversation reads oldest first.
    for (const m of [...messages].reverse()) {
      const other = m.from_user_id === profile.id ? m.to_user_id : m.from_user_id
      const list = threads.get(other) ?? []
      list.push(m)
      threads.set(other, list)
    }
  }

  // Most recently active conversation first.
  const ordered = [...threads.entries()].sort(
    (a, b) =>
      new Date(b[1][b[1].length - 1].created_at).getTime() -
      new Date(a[1][a[1].length - 1].created_at).getTime(),
  )

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs text-faint">{t('messages.crumb')}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {profile.role === 'MANAGER' ? t('messages.titleAll') : t('messages.titleMine')}
        </h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          {profile.role === 'MANAGER' ? t('messages.ledeAll') : t('messages.ledeMine')}
        </p>

        <LoadWarning what={t('admin.loadMessages')} error={messagesError} />

        {profile.role === 'MANAGER' ? (
          <div className="grid gap-3">
            {messages.map((m) => {
              const linked = m.asset_id ? asset.get(m.asset_id) : null
              return (
                <article key={m.id} className="rounded-xl border bg-surface p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted">
                      {name(m.from_user_id)} → {name(m.to_user_id)}
                    </span>
                    <span className="font-mono text-faint">
                      {new Date(m.created_at).toLocaleString(tag)}
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
                {t('messages.noneAll')}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-5">
            {ordered.map(([otherId, thread]) => {
              const other = person.get(otherId)
              const tone = other ? ROLE_TONE[other.role] : 'bg-elevated text-muted'
              return (
                <section key={otherId} className="overflow-hidden rounded-xl border bg-surface">
                  <header className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
                    <h2 className="text-sm font-medium">{name(otherId)}</h2>
                    {other && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone}`}>
                        {t(ROLE_KEY[other.role])}
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[11px] text-faint">
                      {thread.length === 1
                        ? t('messages.countOne')
                        : t('messages.count', { n: thread.length })}
                    </span>
                  </header>

                  <div className="grid gap-3 px-5 py-4">
                    {thread.map((m) => {
                      const outgoing = m.from_user_id === profile.id
                      const linked = m.asset_id ? asset.get(m.asset_id) : null
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[85%] rounded-xl border px-4 py-3 ${
                            outgoing
                              ? 'ml-auto border-accent-text/30 bg-elevated'
                              : 'mr-auto bg-field'
                          }`}
                        >
                          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                            <span className="text-[11px] text-faint">
                              {outgoing ? t('messages.you') : name(m.from_user_id)}
                            </span>
                            <span className="font-mono text-[11px] text-faint">
                              {new Date(m.created_at).toLocaleString(tag)}
                            </span>
                          </div>

                          {linked && (
                            <Link
                              href={`/assets/${linked.id}`}
                              className="mb-1.5 block text-xs text-accent-text hover:underline"
                            >
                              #{linked.public_id} {linked.title}
                            </Link>
                          )}

                          <p className="text-sm">{m.message}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* The reply box lives here rather than only on a listing page, because a
                      message sent from the buyer directory carries no listing to reply from, and
                      the recipient previously had nowhere in the app to answer it at all. */}
                  <div className="border-t bg-field/40 px-5 py-4">
                    <ContactForm
                      compact
                      disabled={suspended}
                      toUserId={otherId}
                      toName={name(otherId)}
                      // Keep the reply attached to whatever listing the conversation is about.
                      assetId={[...thread].reverse().find((m) => m.asset_id)?.asset_id ?? undefined}
                    />
                  </div>
                </section>
              )
            })}

            {ordered.length === 0 && (
              <div className="rounded-xl border bg-surface px-5 py-10 text-center">
                <p className="text-sm text-muted">{t('messages.noneMine')}</p>
                <Link
                  href={profile.role === 'SELLER' ? '/buyers' : '/assets'}
                  className="mt-4 inline-block rounded-full border px-5 py-2 text-sm text-accent-text transition hover:border-accent-text"
                >
                  {profile.role === 'SELLER' ? t('messages.findBuyer') : t('messages.browse')}
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
