import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { formatPriceShort } from '@/lib/format'
import { TopNav } from '@/components/TopNav'
import { ListingStatusControl } from '@/components/ListingStatusControl'
import { ParticipantStatusControl } from '@/components/ParticipantStatusControl'
import type { Asset, Profile } from '@/lib/types'
import { LoadWarning } from '@/components/LoadWarning'
import { StatStrip } from '@/components/StatStrip'

export const metadata = { title: 'Administration' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const STATE_STYLE: Record<Asset['status'], string> = {
  PUBLISHED: 'text-ok bg-ok-bg',
  DRAFT: 'text-muted bg-elevated',
  SUSPENDED: 'text-warn bg-warn-bg',
  REMOVED: 'text-danger bg-danger-bg',
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole('MANAGER')
  const sp = await searchParams
  const str = (v: string | string[] | undefined) => String((Array.isArray(v) ? v[0] : v) ?? '')
  // Two tables, two searches. One shared box meant narrowing the participant list also gutted
  // the listing list, and a manager comparing a seller against their listings lost one of the
  // two halves on every keystroke.
  const pq = str(sp.pq).toLowerCase()
  const aq = str(sp.aq).toLowerCase()
  const pStatus = str(sp.pstatus)
  const pRole = str(sp.prole)
  const aStatus = str(sp.astatus)
  const supabase = await createClient()

  // A manager's read is unfiltered on purpose: the RLS policy for MANAGER returns every
  // row, including drafts and removed listings, which is the whole point of this screen.
  const { data: people, error: peopleError } = await fetchAllRows<Profile>((from, to) =>
    supabase.from('profiles').select('*').order('created_at').range(from, to),
  )
  const { data: assets, error: assetsError } = await fetchAllRows<Asset>((from, to) =>
    supabase.from('assets').select('*').order('created_at', { ascending: false }).range(from, to),
  )

  const byId = new Map(people.map((p) => [p.id, p]))
  const hit = (needle: string, ...fields: (string | null | undefined)[]) =>
    !needle || fields.some((f) => (f ?? '').toLowerCase().includes(needle))

  const visiblePeople = people.filter(
    (p) =>
      hit(pq, p.full_name, p.company, p.email, p.role) &&
      (!pStatus || p.status === pStatus) &&
      (!pRole || p.role === pRole),
  )
  const visibleAssets = assets.filter(
    (a) =>
      hit(aq, a.title, a.country, a.sector, a.license_type, a.regulator) &&
      (!aStatus || a.status === aStatus),
  )

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <p className="text-xs text-faint">N5Deal / Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Participants and listings</h1>
        <p className="mt-1 text-sm text-muted">
          Everything on the platform, including drafts and removed listings.
        </p>

        {/* A moderation console should open with the state of the platform, not with a search box.
            Four numbers a manager acts on: who is here, who is blocked, what is live, what it is
            worth. All four are counted from the same rows the tables below render. */}
        <StatStrip
          stats={[
            { label: 'Participants', value: String(people.length) },
            {
              label: 'Suspended',
              value: String(people.filter((x) => x.status === 'SUSPENDED').length),
              tone: 'text-danger',
            },
            {
              label: 'Live listings',
              value: `${assets.filter((a) => a.status === 'PUBLISHED').length} of ${assets.length}`,
              tone: 'text-ok',
            },
            {
              label: 'Value listed',
              value: formatPriceShort(
                assets
                  .filter((a) => a.status === 'PUBLISHED')
                  .reduce((sum, a) => sum + a.asking_price_cents, 0),
              ),
              tone: 'text-accent-text',
            },
          ]}
        />

        <LoadWarning what="The participant list" error={peopleError} />
        <LoadWarning what="The listing table" error={assetsError} />

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium">
            Participants <span className="text-faint">({visiblePeople.length} of {people.length})</span>
          </h2>

          {/* Plain GET forms: no client state, the filter lives in the URL and the view is
              shareable. Each table keeps its own parameters so one search never empties the other. */}
          <form className="mb-3 flex flex-wrap gap-2">
            <input name="pq" defaultValue={pq} placeholder="Search participants"
              aria-label="Search participants"
              className="min-w-56 flex-1 rounded-full border bg-field px-4 py-2 text-sm" />
            <select name="prole" defaultValue={pRole} aria-label="Filter by role"
              className="rounded-lg border bg-field px-3 py-2 text-sm">
              <option value="">Any role</option>
              <option value="BUYER">Buyer</option>
              <option value="SELLER">Seller</option>
              <option value="MANAGER">Manager</option>
            </select>
            <select name="pstatus" defaultValue={pStatus} aria-label="Filter by status"
              className="rounded-lg border bg-field px-3 py-2 text-sm">
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            {aq && <input type="hidden" name="aq" value={aq} />}
            {aStatus && <input type="hidden" name="astatus" value={aStatus} />}
            <button className="rounded-full border px-4 py-2 text-sm text-muted transition hover:text-fg">Apply</button>
          </form>
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Role</th>
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {visiblePeople.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {p.company ?? p.full_name}
                      <p className="text-xs text-faint">{p.full_name}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.role.toLowerCase()}</td>
                    <td className="px-4 py-3 text-muted">{p.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          p.status === 'ACTIVE' ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger'
                        }`}
                      >
                        {p.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.id !== profile.id && (
                        <ParticipantStatusControl userId={p.id} status={p.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium">
            Listings <span className="text-faint">({visibleAssets.length} of {assets.length})</span>
          </h2>

          <form className="mb-3 flex flex-wrap gap-2">
            <input name="aq" defaultValue={aq} placeholder="Search listings"
              aria-label="Search listings"
              className="min-w-56 flex-1 rounded-full border bg-field px-4 py-2 text-sm" />
            <select name="astatus" defaultValue={aStatus} aria-label="Filter listings by status"
              className="rounded-lg border bg-field px-3 py-2 text-sm">
              <option value="">Any status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REMOVED">Removed</option>
            </select>
            {pq && <input type="hidden" name="pq" value={pq} />}
            {pRole && <input type="hidden" name="prole" value={pRole} />}
            {pStatus && <input type="hidden" name="pstatus" value={pStatus} />}
            <button className="rounded-full border px-4 py-2 text-sm text-muted transition hover:text-fg">Apply</button>
          </form>
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-normal">Asset</th>
                  <th className="px-4 py-3 font-normal">Seller</th>
                  <th className="px-4 py-3 font-normal">Jurisdiction</th>
                  <th className="px-4 py-3 font-normal">Price</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {visibleAssets.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/assets/${a.id}`} className="hover:text-accent-text">
                        {a.title}
                      </Link>
                      <p className="text-xs text-faint">#{a.public_id}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {byId.get(a.seller_id)?.company ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.country}</td>
                    <td className="px-4 py-3">{formatPriceShort(a.asking_price_cents)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${STATE_STYLE[a.status]}`}
                      >
                        {a.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ListingStatusControl assetId={a.id} status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  )
}
