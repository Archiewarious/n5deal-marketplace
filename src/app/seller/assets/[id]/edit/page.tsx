import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { TopNav } from '@/components/TopNav'
import { AssetForm } from '@/components/AssetForm'
import { aiEnabled } from '@/lib/ai'
import type { Asset } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('title')
    .eq('id', id)
    .maybeSingle<{ title: string }>()
  return { title: data ? `Edit ${data.title}` : 'Edit listing' }
}

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('SELLER')
  const { id } = await params
  const supabase = await createClient()

  const { data: asset } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .maybeSingle<Asset>()

  // Two separate checks doing two separate jobs. The first is RLS: a listing this seller may
  // not read never arrives. The second is ownership: a seller CAN read every published listing,
  // so without it they would reach an editor for someone else's asset, fill it in, and only
  // then have the update policy reject it.
  if (!asset || asset.seller_id !== profile.id) notFound()

  const moderated = asset.status === 'SUSPENDED' || asset.status === 'REMOVED'

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs text-faint">
          <Link href="/seller/assets" className="transition hover:text-fg">
            N5Deal / My listings
          </Link>{' '}
          / Edit
        </p>
        <h1 className="mb-1 mt-1 text-2xl font-semibold tracking-tight">{asset.title}</h1>
        <p className="mb-6 text-sm text-muted">
          Changes go live immediately for a published listing. The preview beside the form is the
          card a buyer sees.
        </p>

        {profile.status === 'SUSPENDED' ? (
          <p className="rounded-xl border border-warn bg-warn-bg px-5 py-4 text-sm text-warn">
            Your account is suspended, so this listing cannot be edited. Contact the platform
            manager to restore access.
          </p>
        ) : moderated ? (
          // A manager put this listing in a moderated state, and the assets_guard trigger pins
          // it there. Editing the fields would work; changing the publish state would silently
          // not. Say so rather than offer a control that gets reverted by the database.
          <p className="rounded-xl border border-warn bg-warn-bg px-5 py-4 text-sm text-warn">
            A platform manager has {asset.status === 'SUSPENDED' ? 'suspended' : 'removed'} this
            listing. Only they can put it back on the market.
          </p>
        ) : (
          <AssetForm sellerId={profile.id} asset={asset} aiAvailable={aiEnabled()} />
        )}
      </main>
    </>
  )
}
