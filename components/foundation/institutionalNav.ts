// AVK-UNIFICATION-03B (HEADER-AND-MOBILE-NAV-V3 §2): institutional navigation data, kept out of the
// client header so it can be unit-tested with node --test. Labels come from the SHA-pinned copy
// modules; no item may target WorldK, /enter or an external host (navigation.test.ts).
import { APPROVED_COPY as C } from '../../lib/content/institutionalCopy.ts'
import { UNIFICATION_COPY as U } from '../../lib/content/unificationCopy.ts'
import { LIVING_WORLDS_HREF, LIVING_WORLDS_ROUTE_ENABLED, livingWorldsNavHref } from '../../lib/content/livingWorldsRoute.ts'

export type NavItem = { label: string; href: string }

export function primaryNavItems(livingWorldsEnabled: boolean = LIVING_WORLDS_ROUTE_ENABLED): NavItem[] {
  return [
    { label: U['AVK-U03-HN-01'], href: '/foundation' },
    // Route once U-03C ships /living-worlds; until then the legacy homepage anchor (the Living
    // Worlds experience card). Never a WorldK link.
    { label: C['AVK-FR-003'], href: livingWorldsNavHref(livingWorldsEnabled) },
    { label: U['AVK-U03-HN-03'], href: '/canon' },
    { label: U['AVK-U03-HN-04'], href: '/ecosystem' },
    { label: U['AVK-U03-HN-05'], href: '/founder' },
  ]
}

// echoHref is passed in by the header as lib/content/links.ts ENTER_ECHO_HREF (the existing Echo
// entry, /start). links.ts imports the product registry and cannot load under node --test, so it is
// a parameter here rather than an import.
export function exploreItems(echoHref: string, livingWorldsEnabled: boolean = LIVING_WORLDS_ROUTE_ENABLED): NavItem[] {
  return [
    { label: U['AVK-U03-HN-07'], href: echoHref },
    // Withheld (not rendered, not redirected) until /living-worlds exists.
    ...(livingWorldsEnabled ? [{ label: U['AVK-U03-HN-08'], href: LIVING_WORLDS_HREF }] : []),
    { label: U['AVK-U03-HN-09'], href: '/ecosystem' },
  ]
}

export const EXPLORE_LABEL = U['AVK-U03-HN-06']
