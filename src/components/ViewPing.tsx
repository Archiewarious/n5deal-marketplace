'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Counts one view of a listing, from the browser, once.
 *
 * Deliberately not done in the server component. A page render is not a view: Next.js prefetches
 * on hover, re-renders on a filter change and can render the same route twice on a navigation,
 * and every one of those would have added to the count. A mount in a real browser is the closest
 * cheap thing to a person actually looking at the page.
 *
 * The ref is not decoration. React runs effects twice in development strict mode, so without it
 * every listing would count double in dev and single in production, which is the kind of
 * discrepancy that gets debugged for an hour six months from now.
 *
 * Fire and forget on purpose: the count is a nice-to-have and the page owes it nothing. If the
 * call fails there is nothing useful to say to the reader, so nothing is said. The rules about
 * who may be counted live in the database function, not here — see supabase/07_views.sql.
 */
export function ViewPing({ assetId }: { assetId: string }) {
  const counted = useRef(false)

  useEffect(() => {
    if (counted.current) return
    counted.current = true
    createClient()
      .rpc('bump_asset_views', { a: assetId })
      .then(() => {})
  }, [assetId])

  return null
}
