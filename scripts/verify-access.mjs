/**
 * Proves the access-control claims instead of asking you to believe them.
 *
 *   node scripts/verify-access.mjs                     # against the deployed app
 *   node scripts/verify-access.mjs http://localhost:3000
 *
 * The README says roles are enforced in Postgres rather than in the interface, and that a
 * suspended account's rows stop existing rather than being filtered. Those are the two claims
 * worth distrusting, so this checks both, twice over:
 *
 *   1. Every route, for every role, through the running app. A page that a role may not have
 *      must not return its data — and Next signals a server-side redirect inside a 200 response,
 *      so the check is for NEXT_REDIRECT in the payload rather than for a status code.
 *
 *   2. Every table, for every role, straight against PostgREST with that role's own token — no
 *      application in the path at all. This is the one that matters: it is what an attacker with
 *      a stolen session and curl would see.
 *
 * Exits non-zero on the first mismatch, so it can be pointed at a preview deployment and trusted
 * to fail loudly. The credentials below are the demo accounts published in the README; there is
 * nothing secret here, which is rather the point — the publishable key is what every browser
 * already ships, and the rules hold anyway.
 */

const APP = process.argv[2] ?? 'https://n5deal-marketplace-amber.vercel.app'
const SUPABASE = 'https://jfckkgndgrpepncabjvq.supabase.co'
const KEY = 'sb_publishable_KKpl7CXcjWoqyLabYur3uw_b6kC4bdA'
const REF = 'jfckkgndgrpepncabjvq'
const PASSWORD = 'demo1234'
const CHUNK = 3180

const ACCOUNTS = {
  buyer: 'buyer.harbour@n5demo.com',
  seller: 'seller.nordic@n5demo.com',
  manager: 'manager@n5demo.com',
  suspended: 'buyer.solace@n5demo.com',
}

/** What each role should get from each route: `page` renders it, `bounced` is sent elsewhere. */
const ROUTES = [
  ['/', { anon: 'page', buyer: 'page', seller: 'page', manager: 'page', suspended: 'page' }],
  ['/login', { anon: 'page', buyer: 'page', seller: 'page', manager: 'page', suspended: 'page' }],
  ['/register', { anon: 'page', buyer: 'page', seller: 'page', manager: 'page', suspended: 'page' }],
  ['/assets', { anon: 'bounced', buyer: 'page', seller: 'page', manager: 'page', suspended: 'page' }],
  ['/buyers', { anon: 'bounced', buyer: 'bounced', seller: 'page', manager: 'page', suspended: 'bounced' }],
  ['/buyer/profile', { anon: 'bounced', buyer: 'page', seller: 'bounced', manager: 'bounced', suspended: 'page' }],
  ['/seller/assets', { anon: 'bounced', buyer: 'bounced', seller: 'page', manager: 'bounced', suspended: 'bounced' }],
  ['/seller/assets/new', { anon: 'bounced', buyer: 'bounced', seller: 'page', manager: 'bounced', suspended: 'bounced' }],
  ['/admin', { anon: 'bounced', buyer: 'bounced', seller: 'bounced', manager: 'page', suspended: 'bounced' }],
  ['/messages', { anon: 'bounced', buyer: 'page', seller: 'page', manager: 'page', suspended: 'page' }],
]

/**
 * Rows each role may read straight from PostgREST.
 *
 * `assets` is the interesting column. A buyer sees the published catalogue. A seller sees the
 * catalogue plus their own drafts. A manager sees everything including removed listings. And a
 * suspended account sees nothing at all — not a filtered list, an empty one.
 */
const TABLES = [
  ['assets', { buyer: '>0', seller: '>0', manager: '>0', suspended: '=0', anon: '=0' }],
  // A suspended buyer keeps exactly one mandate and one profile: their own. Suspension hides an
  // account from other people; it does not lock them out of their own row, which is how the
  // "your account is suspended" screen can render at all. Written as an exact count rather than
  // "> 0" because the number is the whole point — one is correct, two would be a leak.
  ['buyer_profiles', { buyer: '>0', seller: '>0', manager: '>0', suspended: '=1', anon: '=0' }],
  ['profiles', { buyer: '>0', seller: '>0', manager: '>0', suspended: '=1', anon: '=0' }],
  ['contact_requests', { buyer: '>0', seller: '>0', manager: '>0', suspended: '=0', anon: '=0' }],
]

const b64url = (s) =>
  Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** @supabase/ssr splits the session cookie once it passes ~3.2KB; this mirrors that. */
function cookieChunks(name, value) {
  let enc = encodeURIComponent(value)
  if (enc.length <= CHUNK) return [{ name, value }]
  const parts = []
  while (enc.length > 0) {
    let head = enc.slice(0, CHUNK)
    const pct = head.lastIndexOf('%')
    if (pct > CHUNK - 3) head = head.slice(0, pct)
    let decoded = ''
    while (head.length > 0) {
      try {
        decoded = decodeURIComponent(head)
        break
      } catch {
        head = head.slice(0, head.length - 3)
      }
    }
    parts.push(decoded)
    enc = enc.slice(head.length)
  }
  return parts.map((value, i) => ({ name: `${name}.${i}`, value }))
}

async function signIn(email) {
  const res = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const session = await res.json()
  if (!session.access_token) throw new Error(`could not sign in as ${email}`)
  const cookie = cookieChunks(`sb-${REF}-auth-token`, 'base64-' + b64url(JSON.stringify(session)))
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ')
  return { token: session.access_token, cookie }
}

let failures = 0
const ok = (b) => (b ? '✓' : '✗')

function check(label, pass, detail) {
  if (!pass) failures++
  console.log(`  ${ok(pass)} ${label}${pass ? '' : `   ${detail}`}`)
}

const roles = ['anon', 'buyer', 'seller', 'manager', 'suspended']

console.log(`\nN5Deal access verification\n  app:      ${APP}\n  database: ${SUPABASE}\n`)

const sessions = { anon: { cookie: '', token: null } }
for (const [role, email] of Object.entries(ACCOUNTS)) sessions[role] = await signIn(email)

console.log('Routes — does the page render, or is the role sent away?\n')
console.log('  ' + 'route'.padEnd(22) + roles.map((r) => r.padEnd(11)).join(''))
for (const [path, expected] of ROUTES) {
  const cells = []
  for (const role of roles) {
    const { cookie } = sessions[role]
    const res = await fetch(APP + path, { headers: cookie ? { cookie } : {}, redirect: 'manual' })
    const body = res.status === 200 ? await res.text() : ''
    // Next.js answers a server-component redirect with 200 and a marker in the payload; the
    // middleware answers with a real 307. Both count as "sent away".
    const got = res.status !== 200 || body.includes('NEXT_REDIRECT') ? 'bounced' : 'page'
    const pass = got === expected[role]
    if (!pass) failures++
    cells.push(`${ok(pass)} ${got}`.padEnd(11))
  }
  console.log('  ' + path.padEnd(22) + cells.join(''))
}

console.log('\nTables — rows readable straight from PostgREST, no application involved\n')
console.log('  ' + 'table'.padEnd(22) + roles.map((r) => r.padEnd(11)).join(''))
for (const [table, expected] of TABLES) {
  const cells = []
  for (const role of roles) {
    const { token } = sessions[role]
    const res = await fetch(`${SUPABASE}/rest/v1/${table}?select=*`, {
      headers: { apikey: KEY, Prefer: 'count=exact', Range: '0-0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    const n = Number((res.headers.get('content-range') ?? '*/0').split('/')[1]) || 0
    const want = expected[role]
    const pass = want.startsWith('=') ? n === Number(want.slice(1)) : n > Number(want.slice(1))
    if (!pass) failures++
    cells.push(`${ok(pass)} ${n}`.padEnd(11))
  }
  console.log('  ' + table.padEnd(22) + cells.join(''))
}

console.log('\nColumn guards — the rules RLS cannot express\n')
{
  const { token } = sessions.seller
  const sellerId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub
  const auth = { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const PROBE = 'ACCESS CHECK — kept on purpose, see scripts/verify-access.mjs'

  // Testing the insert guard means inserting, and nothing in this application can delete: no
  // table has a DELETE policy, by design. So the probe row is created once and reused forever
  // after — the litter is capped at exactly one draft that only a manager can see, instead of
  // growing by one every time somebody runs this.
  const existing = await (
    await fetch(`${SUPABASE}/rest/v1/assets?title=eq.${encodeURIComponent(PROBE)}&select=id,validated`, { headers: auth })
  ).json()

  let row = Array.isArray(existing) ? existing[0] : null
  let how = 'reused'
  if (!row) {
    how = 'created'
    const res = await fetch(`${SUPABASE}/rest/v1/assets`, {
      method: 'POST',
      headers: { ...auth, Prefer: 'return=representation' },
      body: JSON.stringify({
        seller_id: sellerId,
        title: PROBE,
        description:
          'Created by the access verifier to prove a seller cannot set `validated` itself. Left in place because nothing here can delete rows.',
        country: 'Malta',
        sector: 'Payment',
        license_type: 'PI',
        asset_kind: 'LICENSE_ONLY',
        business_state: 'NOT_ACTIVE',
        asking_price_cents: 1,
        status: 'DRAFT',
        validated: true, // the whole point: asking for the platform's own badge on the way in
      }),
    })
    row = res.ok ? (await res.json())[0] : null
    check(
      'a seller cannot award itself the Validated badge on INSERT',
      row ? row.validated === false : false,
      row ? `came back validated=${row.validated}` : `insert failed with ${res.status}`,
    )
  }

  if (row) {
    // The other half of the same trigger. This branch existed first; the INSERT branch was
    // missing, and a seller really could publish a listing that arrived pre-validated.
    await fetch(`${SUPABASE}/rest/v1/assets?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ validated: true }),
    })
    const after = (
      await (await fetch(`${SUPABASE}/rest/v1/assets?id=eq.${row.id}&select=validated`, { headers: auth })).json()
    )[0]
    check('a seller cannot award itself the Validated badge on UPDATE', after.validated === false, `validated=${after.validated}`)
    console.log(`    (probe listing ${how}: one draft, visible only to a manager)`)
  }
}
{
  // The view counter must not move for the person who owns the listing.
  const { token } = sessions.seller
  const mine = await (
    await fetch(`${SUPABASE}/rest/v1/assets?status=eq.PUBLISHED&select=id,views&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${token}` },
    })
  ).json()
  if (mine[0]) {
    const before = mine[0].views
    await fetch(`${SUPABASE}/rest/v1/rpc/bump_asset_views`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: mine[0].id }),
    })
    const after = (
      await (
        await fetch(`${SUPABASE}/rest/v1/assets?id=eq.${mine[0].id}&select=views`, {
          headers: { apikey: KEY, Authorization: `Bearer ${token}` },
        })
      ).json()
    )[0].views
    check('a seller cannot inflate the view count on its own listing', after === before, `${before} → ${after}`)
  }
}
{
  const res = await fetch(`${SUPABASE}/rest/v1/rpc/bump_asset_views`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ a: '00000000-0000-0000-0000-000000000000' }),
  })
  check('an anonymous caller cannot reach the view counter', res.status === 401 || res.status === 403, `got ${res.status}`)
}

console.log(
  failures === 0
    ? '\nEverything held.\n'
    : `\n${failures} mismatch${failures === 1 ? '' : 'es'}. Something is not enforcing what it claims.\n`,
)
process.exit(failures === 0 ? 0 : 1)
