// AVK-UNIFICATION-02: institutional-face feature flags.
//
// Sign In on the institutional face (avatark.ai) is OFF unless this is the
// exact string 'true' -- unset, empty or any other value keeps it hidden.
// Account activation on avatark.ai is a separate, later gate (AVK-UNIFICATION
// U-06: Supabase allow-list, Privacy/Terms, production migrations). This flag
// only controls the institutional header/footer entry points; the /auth/*
// routes and the Echo shell's own sign-in are unchanged.
export function isInstitutionalSignInEnabled(value: string | undefined): boolean {
  return value === 'true'
}

export const INSTITUTIONAL_SIGNIN_ENABLED = isInstitutionalSignInEnabled(
  process.env.NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED,
)
