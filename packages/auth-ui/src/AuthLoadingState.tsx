export function AuthLoadingState({ className }: { className?: string }) {
  return (
    <div className={className} data-avatark-component="auth-loading" role="status" aria-live="polite">
      <span data-avatark-part="label">Checking sign-in status...</span>
    </div>
  )
}
