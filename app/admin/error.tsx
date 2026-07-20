'use client'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900" role="alert">
      <p className="font-semibold">Something went wrong loading this Platform Admin page.</p>
      <p className="mt-1 text-red-700">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold hover:bg-red-100">
        Try again
      </button>
    </div>
  )
}
