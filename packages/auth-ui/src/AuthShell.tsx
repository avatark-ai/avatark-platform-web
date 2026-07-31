import type { ReactNode } from "react"
import { AUTH_EYEBROW, AUTH_HEADING, AUTH_IDENTITY_STATEMENT } from "./copy.ts"

export interface AuthShellProps {
  /** Product shell/header stays outside this component, per the mission. */
  children: ReactNode
  className?: string
}

// The frozen top of the canonical sign-in hierarchy: eyebrow, heading,
// shared identity statement. Product return context renders below this,
// inside children, via <ReturnDestination>.
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <section className={className} data-avatark-component="auth-shell">
      <p data-avatark-part="eyebrow">{AUTH_EYEBROW}</p>
      <h1 data-avatark-part="heading">{AUTH_HEADING}</h1>
      <p data-avatark-part="identity-statement">{AUTH_IDENTITY_STATEMENT}</p>
      {children}
    </section>
  )
}
