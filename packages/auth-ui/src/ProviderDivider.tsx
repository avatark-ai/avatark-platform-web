export function ProviderDivider({ label = "or", className }: { label?: string; className?: string }) {
  return (
    <div className={className} data-avatark-component="provider-divider" role="separator">
      <span data-avatark-part="label">{label}</span>
    </div>
  )
}
