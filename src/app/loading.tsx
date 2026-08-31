// Every data route is an async server component awaiting Supabase, and without this the
// router simply held the old page with no sign anything was happening — a click that appears
// to do nothing is the one interaction people repeat until something breaks.
//
// One file rather than five. The header bar is part of the skeleton because TopNav is rendered
// by each page rather than by a layout, so a loading state necessarily replaces it; a bar of
// the same height in the same place keeps the swap from reading as a flash.
export default function Loading() {
  return (
    <>
      <div className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <div className="h-4 w-16 rounded bg-elevated" />
          <div className="hidden gap-2 sm:flex">
            <div className="h-4 w-14 rounded bg-elevated" />
            <div className="h-4 w-20 rounded bg-elevated" />
            <div className="h-4 w-16 rounded bg-elevated" />
          </div>
          <div className="ml-auto h-4 w-24 rounded bg-elevated" />
        </div>
      </div>

      <main
        className="mx-auto w-full max-w-6xl flex-1 animate-pulse px-4 py-8 sm:px-6"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="h-3 w-28 rounded bg-elevated" />
        <div className="mt-3 h-7 w-72 max-w-full rounded bg-elevated" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-surface" />

        <div className="mt-8 flex gap-2">
          <div className="h-9 flex-1 rounded-full bg-surface" />
          <div className="h-9 w-24 rounded-full bg-elevated" />
        </div>

        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-surface p-5">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-elevated" />
                <div className="h-4 w-56 max-w-full rounded bg-elevated" />
              </div>
              <div className="mt-4 space-y-2">
                {[0, 1, 2, 3].map((r) => (
                  <div key={r} className="h-8 rounded-lg bg-elevated/60" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
