import Link from 'next/link'

export default function JourneySettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>
          Settings
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Settings</h1>
      </div>
      <p className="text-base leading-7" style={{ color: 'var(--text-dim)' }}>
        Your sign-in, profile, and privacy live in Account — nothing about how you practice
        changes there.
      </p>
      <Link
        href="/account"
        className="inline-block w-fit rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--gold)', color: 'var(--midnight)' }}
      >
        Go to Account
      </Link>
    </div>
  )
}
