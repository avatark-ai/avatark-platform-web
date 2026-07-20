export default function AdminSupportPage() {
  return (
    <div className="max-w-lg space-y-3 text-sm">
      <p>Platform-level support: <a className="underline" href="mailto:support@avatark.ai">support@avatark.ai</a></p>
      <p className="text-neutral-500">
        Use the Users page to look up an account by email before responding to a support request. Product-local
        issues (practice content, challenge disputes, in-product bugs) remain owned by each product&apos;s own
        support channel, not this platform surface.
      </p>
    </div>
  )
}
