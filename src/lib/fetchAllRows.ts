// `.range(0, N)` DOES NOT bypass the PostgREST server ceiling. It says "give me at most N",
// but the server still returns at most ITS OWN cap — and does so WITHOUT an error, as an
// ordinary successful response that is simply shorter. Truncation is therefore always
// silent: the code sees an array, does not see the tail, and quietly computes on partial data.
//
// The ceiling lives in Supabase -> Settings -> API -> Data API -> "Max rows" (default 1000).
const PAGE = 1000
// Pages are fetched TWO AT A TIME. A sequential loop costs an extra round trip per set,
// and for RPC that is twice as expensive: PostgREST runs the function in full for every
// page. Measured on the source project: 431ms for two sequential calls vs ~215ms in parallel.
// The price is one extra (empty) request for sets that fit in a single page; it runs in
// parallel with the first and adds no time.
const BATCH = 2

export async function fetchAllRows<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown }> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE * BATCH) {
    const batch = await Promise.all(
      Array.from({ length: BATCH }, (_, i) => make(from + i * PAGE, from + (i + 1) * PAGE - 1)),
    )
    let done = false
    for (const { data, error } of batch) {
      // The error is returned together with whatever was collected: callers gate the UI on
      // `error`, not on length — partial data must not pretend to be complete.
      if (error) return { data: out, error }
      const chunk = data ?? []
      out.push(...chunk)
      if (chunk.length < PAGE) done = true
    }
    if (done) return { data: out, error: null }
  }
}
