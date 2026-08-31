import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { TopNav } from '@/components/TopNav'
import { AssetForm } from '@/components/AssetForm'
import { aiEnabled } from '@/lib/ai'
import { getT } from '@/lib/locale'
import type { Asset } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getT()
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('title')
    .eq('id', id)
    .maybeSingle<{ title: string }>()
  return { title: data ? t('meta.edit', { title: data.title }) : t('meta.editListing') }
}

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('SELLER')
  const t = await getT()
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
            {t('seller.crumb')}
          </Link>{' '}
          / {t('seller.editCrumb')}
        </p>
        <h1 className="mb-1 mt-1 text-2xl font-semibold tracking-tight">{asset.title}</h1>
        <p className="mb-6 text-sm text-muted">
          {t('form.editLede')}
        </p>

        {profile.status === 'SUSPENDED' ? (
          <p className="rounded-xl border border-warn bg-warn-bg px-5 py-4 text-sm text-warn">
            {t('form.suspendedEdit')}
          </p>
        ) : moderated ? (
          // A manager put this listing in a moderated state, and the assets_guard trigger pins
          // it there. Editing the fields would work; changing the publish state would silently
          // not. Say so rather than offer a control that gets reverted by the database.
          <p className="rounded-xl border border-warn bg-warn-bg px-5 py-4 text-sm text-warn">
            {t('form.moderated', {
              state: t(asset.status === 'SUSPENDED' ? 'state.suspendedVerb' : 'state.removedVerb'),
            })}
          </p>
        ) : (
          <AssetForm sellerId={profile.id} asset={asset} aiAvailable={aiEnabled()} />
        )}
      </main>
    </>
  )
}
