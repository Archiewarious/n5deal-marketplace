import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

// Refreshes the Supabase session and guards routes: anonymous visitors go to /login.
//
// The session check is LOCAL, with no network call. getUser() would be a round trip to
// Supabase Auth on EVERY request (the matcher catches all routes), which costs 100-200ms
// per click. getClaims() verifies the JWT signature cryptographically with the project's
// public key (ES256, JWKS cached in the isolate) and checks exp. Authenticity guarantee
// is identical: a token cannot be forged without Supabase's private key.
//   - Token refresh still happens: getClaims() calls getSession() internally, which
//     refreshes an expired token and writes cookies through our setAll.
//   - With a symmetric key or no WebCrypto, auth-js falls back to getUser() by itself.
//   - The one difference: a revoked session stops being accepted within the access token
//     lifetime (~1h) rather than instantly. This is not a weakening of DATA access —
//     PostgREST validates only signature and exp anyway.
//   - Role changes still apply instantly: RLS reads profiles.role live, not from the token.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not put any code between createServerClient and the session check —
  // the session can desynchronise (requirement of @supabase/ssr).
  const { data: claims } = await supabase.auth.getClaims()
  const user = claims?.claims?.sub ?? null

  const isLoginRoute = request.nextUrl.pathname.startsWith('/login')

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
