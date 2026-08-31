/**
 * The handful of numbers a screen is actually about, before the table that proves them.
 *
 * Both consoles open with one: a manager needs to know who is blocked and what is live before
 * they start searching, a seller needs to know what their listings are earning in attention.
 * Every value is counted from the same rows rendered below it, so the strip can never drift
 * away from the table.
 */
export function StatStrip({
  stats,
}: {
  stats: { label: string; value: string; tone?: string }[]
}) {
  return (
    <div className="mb-8 mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="rise rounded-xl border bg-surface px-4 py-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <p className="text-[10px] uppercase tracking-wider text-faint">{s.label}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.tone ?? 'text-fg'}`}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  )
}
