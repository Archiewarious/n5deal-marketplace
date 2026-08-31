import { getT } from '@/lib/locale'

/**
 * Shown when a read came back with an error.
 *
 * `fetchAllRows` returns whatever it collected together with the error, so a page can still
 * render — but a half-loaded table that looks complete is how a manager suspends the wrong
 * account. Four of the five pages used to drop the error on the floor and render the partial
 * set silently; this component exists so that never happens by omission again.
 */
export async function LoadWarning({ what, error }: { what: string; error: unknown }) {
  if (!error) return null
  const t = await getT()
  return (
    <p
      role="status"
      className="mb-4 rounded-lg border border-danger bg-danger-bg px-3 py-2 text-sm text-danger"
    >
      {t('warn.partial', { what })}
    </p>
  )
}
