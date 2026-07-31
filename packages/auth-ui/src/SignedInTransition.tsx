import { useProductIdentity } from "./ProductIdentityContext.tsx"

// A brief, explicit "signed in, returning you..." state so a successful
// callback doesn't flash a stale signed-out sign-in form before the
// redirect completes.
export function SignedInTransition({ className }: { className?: string }) {
  const { productName } = useProductIdentity()
  return (
    <div className={className} data-avatark-component="signed-in-transition" role="status" aria-live="polite">
      <p data-avatark-part="message">Signed in. Returning you to {productName}...</p>
    </div>
  )
}
