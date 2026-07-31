// Canonical sign-in copy (Mission Part 2). These are the only strings a
// product may override for its own context; the eyebrow/heading/identity
// statement are frozen and shared across every product.

export const AUTH_EYEBROW = "AVATARK IDENTITY"
export const AUTH_HEADING = "Sign in"
export const AUTH_IDENTITY_STATEMENT = "One identity across the AvatarK ecosystem."

// Consumer-safe unavailable-state copy. This is the ONLY string
// AuthUnavailableState is allowed to render -- never a deployment-
// misconfiguration detail (missing env vars, disabled providers, database
// unavailability). Diagnostics for those live in a protected surface, not
// here.
export const AUTH_UNAVAILABLE_MESSAGE = "Sign-in is temporarily unavailable. Please try again later."

export type AuthUIProductId =
  | "gamek"
  | "studiok"
  | "streamk"
  | "cinemak"
  | "arenak"
  | "prometheusk"
  | "atlas"
  | "setpointk"

// Product return-context sentences, verbatim from the mission spec.
export const PRODUCT_SIGN_IN_CONTEXT: Record<AuthUIProductId, string> = {
  gamek: "You will return to GameK when sign-in is complete.",
  studiok: "You will return to StudioK to continue creating.",
  streamk: "You will return to StreamK to continue watching.",
  cinemak: "You will return to CinemaK to continue your cinematic experience.",
  arenak: "You will return to ArenaK to continue your invitation, event, or challenge.",
  prometheusk: "You will return to PrometheusK, where your practices and Living Echo live.",
  atlas: "You will return to Atlas to continue your project or research.",
  setpointk: "You will return to SetpointK to continue with your authorized physiological data experience.",
}

// Phrases that must NEVER appear in any auth-ui rendered output. This list
// is the regression contract for AuthUnavailableState and AuthErrorState --
// see noSecrets.test.ts.
export const FORBIDDEN_DIAGNOSTIC_PHRASES = [
  "supabase",
  "env var",
  "environment variable",
  "not configured",
  "is not configured",
  "database unavailable",
  "provider flag",
  "service role",
  "service_role",
  "project ref",
  "anon key",
  "jwt",
]
