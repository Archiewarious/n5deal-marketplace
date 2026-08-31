import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/session'
import { TopNav } from '@/components/TopNav'
import { MandateForm } from '@/components/MandateForm'
import type { BuyerProfile } from '@/lib/types'

export const metadata = { title: 'Your mandate' }

export default async function BuyerProfilePage() {
  const profile = await requireRole('BUYER')
  const supabase = await createClient()

  const { data: mandate } = await supabase
    .from('buyer_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle<BuyerProfile>()

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="text-xs text-faint">N5Deal / My mandate</p>
        <h1 className="mb-1 text-xl font-semibold">Your profile and mandate</h1>
        <p className="mb-6 text-sm text-muted">
          Sellers browse this, and the catalogue sorts listings by how well they fit it.
        </p>
        <MandateForm profile={profile} mandate={mandate} />
      </main>
    </>
  )
}
