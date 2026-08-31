// Detector for silent response truncation by PostgREST.
//
// WHY. The server-side "Max rows" ceiling truncates every table read — and it does so
// WITHOUT an error, as an ordinary successful response that is simply shorter. The code
// sees an array, does not see the missing tail, and quietly computes on partial data.
// That is why truncation is normally found months later, via a wrong number on screen.
//
// HOW. PostgREST returns `Content-Range: 0-9999/*` on every read, which says how many
// rows actually travelled. If that equals the ceiling, the tail was almost certainly cut:
// a set of exactly N rows is far rarer than a larger one.
// Only the header is read — the body is never touched, otherwise it would have to be
// cloned, and that is a needless copy of megabyte responses on a hot path.
//
// This is DIAGNOSTICS, NOT A FIX. The warning does not make the data complete; it only
// says where to put `fetchAllRows`. The cure is always paginated reading.
const ROW_CAP = 1000

export function fetchWithRowCapWarning(): typeof fetch {
  return async (input, init) => {
    const res = await fetch(input, init)
    const range = res.headers.get('content-range')
    if (range) {
      const rows = Number(range.split('/')[0]?.split('-')[1] ?? -1) + 1
      if (rows === ROW_CAP) {
        const url = typeof input === 'string' ? input : String((input as Request).url ?? input)
        console.warn(
          `[rowCap] PostgREST returned exactly ${ROW_CAP} rows for ${url} — the tail was probably truncated. Use fetchAllRows().`,
        )
      }
    }
    return res
  }
}
