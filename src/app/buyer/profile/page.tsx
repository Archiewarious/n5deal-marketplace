import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { TopNav } from '@/components/TopNav'
import { MandateForm } from '@/components/MandateForm'
import { getT } from '@/lib/locale'
import type { BuyerProfile } from '@/lib/types'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('mandate.title') }
}

export default async function BuyerProfilePage() {
  const profile = await requireRole('BUYER')
  const t = await getT()
  const supabase = await createClient()

  const { data: mandate } = await supabase
    .from('buyer_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle<BuyerProfile>()

  return (
    <>
      <TopNav profile={profile} />
      <main id="content" className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-xs text-faint">{t('mandate.crumb')}</p>
        <h1 className="mb-1 text-xl font-semibold">{t('mandate.title')}</h1>
        <p className="mb-6 text-sm text-muted">{t('mandate.lede')}</p>
        <MandateForm profile={profile} mandate={mandate} />
      </main>
    </>
  )
}
