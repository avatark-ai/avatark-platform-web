import { useProductIdentity } from "./ProductIdentityContext.tsx"

// Renders the product return-context sentence only. This component never
// validates the return path itself -- that safety check already happened
// via @avatark/auth's safeReturnPath before this component is ever mounted;
// re-validating here would just be a second, divergent implementation.
export function ReturnDestination({ className }: { className?: string }) {
  const { signInContext } = useProductIdentity()
  return (
    <p className={className} data-avatark-component="return-destination">
      {signInContext}
    </p>
  )
}
