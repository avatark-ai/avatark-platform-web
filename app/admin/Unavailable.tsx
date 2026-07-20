// Shared, honest "can't verify this" state for admin views that need the
// service-role client. Never hides the fact that data is unavailable
// behind a fabricated empty state.
export function AdminUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Unavailable in this environment: {reason ?? 'SUPABASE_SERVICE_ROLE_KEY is not configured.'}
    </div>
  )
}
