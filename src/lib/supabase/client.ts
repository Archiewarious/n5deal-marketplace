import { createBrowserClient } from '@supabase/ssr'
import { fetchWithRowCapWarning } from './rowCap'

// Browser client, used in client components (login, forms).
// Custom fetch = silent-truncation detector, see rowCap.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: fetchWithRowCapWarning() } },
  )
}

export type TypedSupabaseClient = ReturnType<typeof createClient>
