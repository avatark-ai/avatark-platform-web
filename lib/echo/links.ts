// Central destination registry for the Echo shell (nav, footer, landing
// CTAs, mobile menu) -- sibling to lib/content/links.ts, which stays the
// institutional shell's own destination config, untouched. Every Echo
// route href is defined once here so components never hardcode a path --
// the eventual echo.avatark.ai cutover and any future route rename stay a
// one-file change, per docs/ECHO_DOMAIN_MIGRATION.md.
import { getProductById } from "@avatark/product-registry";
import { resolveProductUrl } from "@/lib/products/registry";
import { SIGN_IN_HREF } from "@/lib/content/links";

// BEGIN
export const START_HERE_HREF = "/start";
export const ENTER_INVITATION_HREF = "/enter";
export const WATCH_FIRST_HREF = "/watch-first";
export const CREATE_MY_ECHO_HREF = "/echo/create";

// DISCOVER
export const DISCOVER_HREF = "/discover";

export function echoDetailHref(slug: string): string {
  return `/echo/${slug}`;
}

export function practiceDetailHref(id: string): string {
  return `/practice/${id}`;
}

// PRACTICE
export const TODAY_HREF = "/today";

// COMMUNITY / STORIES
export const COMMUNITY_HREF = "/community";
export const STORIES_HREF = "/stories";

// MY JOURNEY
export const MY_ECHO_HREF = "/my/echo";
export const LIVING_ECHO_HREF = "/my/echo/living-preview";
export const JOURNAL_HREF = "/my/journal";
export const MY_JOURNEY_HREF = "/my/journey";
export const ACCOUNT_HREF = "/account";

// AUTH -- reused from the institutional registry, not duplicated.
export { SIGN_IN_HREF };

// AVATARK (institutional cross-links shown in the Echo footer)
export const WHY_AVATARK_HREF = "/";
export const FOUNDER_LETTER_HREF = "/founder";
export const ARCHITECTURE_HREF = "/#canon";
export const ECOSYSTEM_HREF = "/roadmap";

// Cross-product attribution links ("Powered by ArenaK" / "Powered by
// StreamK and CinemaK" copy, Community/Stories empty-state CTAs) --
// resolved through the same shared registry every other cross-product
// link in this repo uses, never a second hardcoded domain. Null when the
// registry has no confirmed domain, so callers can omit the link rather
// than render a dead one.
export function arenakHref(): string | null {
  const arenak = getProductById("arenak");
  return arenak ? resolveProductUrl(arenak) : null;
}

export function streamkHref(): string | null {
  const streamk = getProductById("streamk");
  return streamk ? resolveProductUrl(streamk) : null;
}

export function cinemakHref(): string | null {
  const cinemak = getProductById("cinemak");
  return cinemak ? resolveProductUrl(cinemak) : null;
}
