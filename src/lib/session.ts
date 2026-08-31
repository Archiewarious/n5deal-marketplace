import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { Profile } from './types'

/**
 * The signed-in profile, or a redirect to /login.
 *
 * Every page calls this instead of reading auth state itself, so there is exactly one
 * place that decides what "signed in" means. Note that the role is read from the
 * database, not from the JWT: a manager who changes someone's role takes effect on the
 * next request, and RLS enforces the same rule server-side regardless of what the UI does.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) redirect('/login')
  return profile
}

/** Guards a page to specific roles; anyone else lands on the listing catalogue. */
export async function requireRole(...roles: Profile['role'][]): Promise<Profile> {
  const profile = await requireProfile()
  if (!roles.includes(profile.role)) redirect('/assets')
  return profile
}
