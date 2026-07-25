// Central destination config for the institutional AvatarK.ai shell
// (nav, hero, footer, final CTA) -- so "Enter Echo" and friends are
// defined once, not re-typed as a literal string in every component that
// renders the CTA.
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '../products/registry.ts'

// Echo itself isn't built yet (explicit non-goal for this milestone; it
// will eventually be its own consumer experience, e.g. echo.avatark.ai).
// Until then, "Enter Echo" points at AvatarK's own real, shipped
// onboarding funnel into Practice (RC1-RC6, unchanged) rather than a
// fabricated Echo destination or a dead link.
export const ENTER_ECHO_HREF = '/start'

export const SIGN_IN_HREF = '/auth/sign-in'
export const INVITATION_HREF = '/enter'

// Migrated the same way app/page.tsx's old WATCH_FIRST_URL literal was:
// resolved through the registry so PrometheusK's domain changing doesn't
// require an institutional-site edit.
export function watchFirstHref(): string | null {
  const prometheusk = getProductById('prometheusk')
  if (!prometheusk) return null
  const domain = resolveProductUrl(prometheusk)
  return domain ? `${domain}/watch-first` : null
}
