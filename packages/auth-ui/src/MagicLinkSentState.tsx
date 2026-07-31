export function MagicLinkSentState({ email, className }: { email: string; className?: string }) {
  return (
    <div className={className} data-avatark-component="magic-link-sent" role="status">
      <p data-avatark-part="message">
        Check <strong data-avatark-part="email">{email}</strong> for a sign-in link.
      </p>
    </div>
  )
}
