import { requireRole } from '@/lib/session'
import { TopNav } from '@/components/TopNav'
import { AssetForm } from '@/components/AssetForm'

export const metadata = { title: 'Publish an asset' }

export default async function NewAssetPage() {
  const profile = await requireRole('SELLER')
  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs text-faint">N5Deal / My listings / New</p>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Publish an asset</h1>
        <p className="mb-6 text-sm text-muted">
          Buyers filter on these fields, so anything left blank makes the listing harder to find.
        </p>
        {profile.status === 'SUSPENDED' ? (
          // Without this the form submits, RLS rejects the insert, and the seller reads a raw
          // Postgres policy error. Saying it up front costs one branch.
          <p className="rounded-xl border border-warn bg-warn-bg px-5 py-4 text-sm text-warn">
            Your account is suspended, so you cannot publish. Contact the platform manager to
            restore access — your existing listings are kept.
          </p>
        ) : (
          <AssetForm sellerId={profile.id} />
        )}
      </main>
    </>
  )
}
