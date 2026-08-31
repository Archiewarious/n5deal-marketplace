import { requireRole } from '@/lib/session'
import { TopNav } from '@/components/TopNav'
import { NewAssetForm } from '@/components/NewAssetForm'

export default async function NewAssetPage() {
  const profile = await requireRole('SELLER')
  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-xs text-faint">N5Deal / My listings / New</p>
        <h1 className="mb-1 text-xl font-semibold">Publish an asset</h1>
        <p className="mb-6 text-sm text-muted">
          Buyers filter on these fields, so anything left blank makes the listing harder to find.
        </p>
        <NewAssetForm sellerId={profile.id} />
      </main>
    </>
  )
}
