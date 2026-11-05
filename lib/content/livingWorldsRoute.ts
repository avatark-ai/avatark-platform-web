// AVK-UNIFICATION-03B: fail-closed route-enable for the dedicated /living-worlds page.
//
// The /living-worlds route is built in U-03C. Until it exists, every "Discover Living Worlds"
// action (hero secondary action, Living Worlds card action, Explore menu item) is WITHHELD -- not
// rendered and not pointed elsewhere -- and the header's "Living Worlds" item keeps the legacy
// homepage anchor /#living-worlds, which resolves to the Living Worlds experience card. U-03C sets
// this to true in the same commit that adds app/living-worlds/page.tsx (livingWorldsRoute.test.ts
// fails if the constant and the route file disagree), and may then remove the constant.
export const LIVING_WORLDS_ROUTE_ENABLED: boolean = false

export const LIVING_WORLDS_HREF = '/living-worlds'
export const LIVING_WORLDS_LEGACY_ANCHOR = '/#living-worlds'

export function livingWorldsNavHref(enabled: boolean = LIVING_WORLDS_ROUTE_ENABLED): string {
  return enabled ? LIVING_WORLDS_HREF : LIVING_WORLDS_LEGACY_ANCHOR
}
