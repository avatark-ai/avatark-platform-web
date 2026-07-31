// Target contract only -- not yet implemented against a concrete provider.
// This repo's real sign-in flow (magic link + flagged/unconfigured Google,
// via app/auth/sign-in/page.tsx and lib/auth/{principal,
// resolveClientPrincipal}.ts) works today and isn't rewired to this
// interface in this pass -- doing so would be a behavior-changing rewrite
// of a working flow, not a relocation. Declared here so the shape mission
// asked for ("single auth API: login/logout/currentUser/session/refresh,
// provider abstraction") exists as a real, checkable artifact that a
// future increment can implement, instead of being lost as prose.
export type AuthSession = {
  userId: string
  email: string
} | null

export interface AuthProvider {
  login(): Promise<void>
  logout(): Promise<void>
  currentUser(): Promise<AuthSession>
  session(): Promise<AuthSession>
  refresh(): Promise<AuthSession>
}
