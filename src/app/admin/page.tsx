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
import { CountryTag } from '@/components/CountryTag'
import { getT } from '@/lib/locale'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('nav.admin') }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const ROLE_STYLE: Record<Profile['role'], string> = {
  SELLER: 'text-seller',
  BUYER: 'text-buyer',
  MANAGER: 'text-manager',
}

const STATE_STYLE: Record<Asset['status'], string> = {
  PUBLISHED: 'text-ok bg-ok-bg',
  DRAFT: 'text-muted bg-elevated',
  SUSPENDED: 'text-warn bg-warn-bg',
  REMOVED: 'text-danger bg-danger-bg',
}

const ROLE_KEY: Record<Profile['role'], string> = {
  SELLER: 'role.seller',
  BUYER: 'role.buyer',
  MANAGER: 'role.managerShort',
}

const STATUS_KEY: Record<Profile['status'], string> = {
  ACTIVE: 'admin.statusActive',
  SUSPENDED: 'admin.statusSuspended',
}

const STATE_KEY: Record<Asset['status'], string> = {
  PUBLISHED: 'state.published',
  DRAFT: 'state.draft',
  SUSPENDED: 'state.suspended',
  REMOVED: 'state.removed',
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole('MANAGER')
  const t = await getT()
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
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <p className="text-xs text-faint">{t('admin.crumb')}</p>
        <h1 className="heading text-2xl font-semibold">{t('admin.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('admin.lede')}</p>

        {/* A moderation console should open with the state of the platform, not with a search box.
            Four numbers a manager acts on: who is here, who is blocked, what is live, what it is
            worth. All four are counted from the same rows the tables below render. */}
        <StatStrip
          stats={[
            { label: t('admin.participants'), value: String(people.length) },
            {
              label: t('admin.suspendedStat'),
              value: String(people.filter((x) => x.status === 'SUSPENDED').length),
              tone: 'text-danger',
            },
            {
              label: t('admin.liveListings'),
              value: t('admin.ofTotal', {
                shown: assets.filter((a) => a.status === 'PUBLISHED').length,
                total: assets.length,
              }),
              tone: 'text-ok',
            },
            {
              label: t('admin.valueListed'),
              value: formatPriceShort(
                assets
                  .filter((a) => a.status === 'PUBLISHED')
                  .reduce((sum, a) => sum + a.asking_price_cents, 0),
              ),
              tone: 'text-accent-text',
            },
          ]}
        />

        <LoadWarning what={t('admin.loadParticipants')} error={peopleError} />
        <LoadWarning what={t('admin.loadListings')} error={assetsError} />

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium">
            {t('admin.participants')}{' '}
            <span className="text-faint">
              ({t('admin.ofTotal', { shown: visiblePeople.length, total: people.length })})
            </span>
          </h2>

          {/* Plain GET forms: no client state, the filter lives in the URL and the view is
              shareable. Each table keeps its own parameters so one search never empties the other. */}
          <form className="mb-3 flex flex-wrap gap-2">
            <input name="pq" defaultValue={pq} placeholder={t('admin.searchParticipants')}
              aria-label={t('admin.searchParticipants')}
              className="min-w-56 flex-1 rounded-full border bg-field px-4 py-2 text-sm" />
            <select name="prole" defaultValue={pRole} aria-label={t('admin.filterByRole')}
              className="rounded-lg border bg-field px-3 py-2 text-sm">
              <option value="">{t('admin.anyRole')}</option>
              <option value="BUYER">{t('role.buyer')}</option>
              <option value="SELLER">{t('role.seller')}</option>
              <option value="MANAGER">{t('role.managerShort')}</option>
            </select>
            <select name="pstatus" defaultValue={pStatus} aria-label={t('admin.filterByStatus')}
              className="rounded-lg border bg-field px-3 py-2 text-sm">
              <option value="">{t('admin.anyStatus')}</option>
              <option value="ACTIVE">{t('admin.statusActive')}</option>
              <option value="SUSPENDED">{t('admin.statusSuspended')}</option>
            </select>
            {aq && <input type="hidden" name="aq" value={aq} />}
            {aStatus && <input type="hidden" name="astatus" value={aStatus} />}
            <button className="rounded-full border px-4 py-2 text-sm text-muted transition hover:text-fg">{t('admin.apply')}</button>
          </form>
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-normal">{t('admin.colName')}</th>
                  <th className="px-4 py-3 font-normal">{t('admin.colRole')}</th>
                  <th className="px-4 py-3 font-normal">{t('admin.colEmail')}</th>
                  <th className="px-4 py-3 font-normal">{t('admin.colStatus')}</th>
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
                    <td className={`px-4 py-3 font-mono text-xs ${ROLE_STYLE[p.role]}`}>
                      {t(ROLE_KEY[p.role])}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          p.status === 'ACTIVE' ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger'
                        }`}
                      >
                        {t(STATUS_KEY[p.status])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.id !== profile.id && (
                        <ParticipantStatusControl userId={p.id} status={p.status} />
                      )}
                    </td>
                  </tr>
                ))}
                {visiblePeople.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <p className="text-sm text-muted">{t('admin.emptyPeople')}</p>
                      <Link
                        href="/admin"
                        className="mt-3 inline-block rounded-full border px-4 py-1.5 text-sm text-accent-text transition hover:border-accent-text"
                      >
                        {t('admin.clear')}
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium">
            {t('admin.listings')}{' '}
            <span className="text-faint">
              ({t('admin.ofTotal', { shown: visibleAssets.length, total: assets.length })})
            </span>
          </h2>

          <form className="mb-3 flex flex-wrap gap-2">
            <input name="aq" defaultValue={aq} placeholder={t('admin.searchListings')}
              aria-label={t('admin.searchListings')}
              className="min-w-56 flex-1 rounded-full border bg-field px-4 py-2 text-sm" />
            <select name="astatus" defaultValue={aStatus} aria-label={t('admin.filterListingsByStatus')}
              className="rounded-lg border bg-field px-3 py-2 text-sm">
              <option value="">{t('admin.anyStatus')}</option>
              <option value="PUBLISHED">{t('form.published')}</option>
              <option value="DRAFT">{t('form.draft')}</option>
              <option value="SUSPENDED">{t('state.suspended')}</option>
              <option value="REMOVED">{t('state.removed')}</option>
            </select>
            {pq && <input type="hidden" name="pq" value={pq} />}
            {pRole && <input type="hidden" name="prole" value={pRole} />}
            {pStatus && <input type="hidden" name="pstatus" value={pStatus} />}
            <button className="rounded-full border px-4 py-2 text-sm text-muted transition hover:text-fg">{t('admin.apply')}</button>
          </form>
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-normal">{t('seller.colAsset')}</th>
                  <th className="px-4 py-3 font-normal">{t('admin.colSeller')}</th>
                  <th className="px-4 py-3 font-normal">{t('seller.colJurisdiction')}</th>
                  <th className="px-4 py-3 font-normal">{t('seller.colPrice')}</th>
                  <th className="px-4 py-3 font-normal">{t('admin.colStatus')}</th>
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
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-muted">
                        <CountryTag country={a.country} />
                        <span className="hidden lg:inline">{a.country}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatPriceShort(a.asking_price_cents)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${STATE_STYLE[a.status]}`}
                      >
                        {t(STATE_KEY[a.status])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ListingStatusControl assetId={a.id} status={a.status} />
                    </td>
                  </tr>
                ))}
                {visibleAssets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <p className="text-sm text-muted">{t('admin.emptyListings')}</p>
                      <Link
                        href="/admin"
                        className="mt-3 inline-block rounded-full border px-4 py-1.5 text-sm text-accent-text transition hover:border-accent-text"
                      >
                        {t('admin.clear')}
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  )
}
