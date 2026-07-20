export default function AdminLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-neutral-100" />
      ))}
    </div>
  )
}
