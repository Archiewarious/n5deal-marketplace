import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiEnabled, reviewListing } from '@/lib/ai'

/**
 * A second read of a draft listing before it goes live.
 *
 * Sellers only. A buyer has no listings to check, and the route exists to spend a model call, so
 * it should not be callable by anyone who has no reason to.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims?.sub
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', uid)
    .maybeSingle<{ role: string; status: string }>()

  if (profile?.role !== 'SELLER' || profile.status !== 'ACTIVE') {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  if (!aiEnabled()) return NextResponse.json({ ok: false })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Everything is coerced to a bounded string. The body reaches a model prompt, so the shape it
  // arrives in is the shape it must not be trusted in.
  const s = (v: unknown) => (typeof v === 'string' ? v.slice(0, 2000) : '')
  const notes = await reviewListing({
    title: s(body.title),
    description: s(body.description),
    country: s(body.country),
    sector: s(body.sector),
    license_type: s(body.license_type),
    regulator: s(body.regulator),
    asset_kind: s(body.asset_kind),
    business_state: s(body.business_state),
    year_of_issue: s(body.year_of_issue),
    employees: s(body.employees),
    price: s(body.price),
    included_activities: s(body.included_activities),
  })

  if (notes === null) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, notes })
}
