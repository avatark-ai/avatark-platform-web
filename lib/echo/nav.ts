// Echo's primary navigation model -- a fixed, two-level structure: six
// primary categories always visible in the header, each with its own set
// of contextual destinations shown in a second bar beneath it. Shared by
// EchoHeader (desktop primary bar + mobile accordion) and EchoContextNav
// (desktop/tablet context bar), so the two surfaces can't drift.
//
// Every href here resolves to a real, distinct route or an explicit
// `?view=`/`?tab=` query-addressable state on a page that actually
// branches on it (never a `#hash` anchor -- anchors caused inconsistent
// scroll landing and made several sibling destinations indistinguishable
// from one another, since a merged/scrolled page can't tell them apart).
import {
  ACCOUNT_HREF,
  COMMUNITY_HREF,
  CREATE_MY_ECHO_HREF,
  DISCOVER_HREF,
  ENTER_INVITATION_HREF,
  JOURNAL_HREF,
  MY_ECHO_HREF,
  MY_JOURNEY_HREF,
  START_HERE_HREF,
  STORIES_HREF,
  TODAY_HREF,
  WATCH_FIRST_HREF,
  WHAT_IS_AN_ECHO_HREF,
} from "./links";

export interface EchoContextLink {
  label: string;
  href: string;
}

export interface EchoPrimaryCategory {
  id: string;
  label: string;
  /** Canonical landing route for this category -- where clicking the primary label itself navigates. */
  href: string;
  /** Path prefixes this category "owns" for active-state matching. Checked in PRIMARY_CATEGORIES order. */
  matchPrefixes: string[];
  context: EchoContextLink[];
  attribution?: string;
}

export const PRIMARY_CATEGORIES: EchoPrimaryCategory[] = [
  {
    id: "begin",
    label: "Begin",
    href: START_HERE_HREF,
    matchPrefixes: ["/start", "/what-is-an-echo", "/enter", "/watch-first", "/echo/create"],
    context: [
      { label: "Start Here", href: START_HERE_HREF },
      { label: "What is an Echo?", href: WHAT_IS_AN_ECHO_HREF },
      { label: "Enter Invitation", href: ENTER_INVITATION_HREF },
      { label: "Watch First", href: WATCH_FIRST_HREF },
      { label: "Create My Echo", href: CREATE_MY_ECHO_HREF },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    href: DISCOVER_HREF,
    matchPrefixes: ["/discover", "/echo/"],
    context: [
      { label: "Featured Echoes", href: `${DISCOVER_HREF}?view=echoes` },
      { label: "Featured Practices", href: `${DISCOVER_HREF}?view=practices` },
      { label: "Collections", href: `${DISCOVER_HREF}?view=collections` },
      { label: "Topics", href: `${DISCOVER_HREF}?view=topics` },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    href: TODAY_HREF,
    matchPrefixes: ["/today", "/practice", "/journey"],
    context: [
      { label: "Today", href: TODAY_HREF },
      { label: "Browse", href: `${DISCOVER_HREF}?view=practices` },
      { label: "My Library", href: `${MY_ECHO_HREF}?tab=practices` },
    ],
    attribution: "Powered by PrometheusK",
  },
  {
    id: "community",
    label: "Community",
    href: COMMUNITY_HREF,
    matchPrefixes: ["/community"],
    context: [
      { label: "Challenges", href: "/community/challenges" },
      { label: "Groups", href: "/community/groups" },
      { label: "Events", href: "/community/events" },
      { label: "Cohorts", href: "/community/cohorts" },
      { label: "Recognition", href: "/community/recognition" },
    ],
    attribution: "Powered by ArenaK",
  },
  {
    id: "stories",
    label: "Stories",
    href: STORIES_HREF,
    matchPrefixes: ["/stories"],
    context: [
      { label: "Watch", href: `${STORIES_HREF}?view=watch` },
      { label: "Episodes", href: `${STORIES_HREF}?view=episodes` },
      { label: "Live", href: `${STORIES_HREF}?view=live` },
      { label: "Films", href: `${STORIES_HREF}?view=films` },
    ],
    attribution: "Powered by StreamK and CinemaK",
  },
  {
    id: "my-journey",
    label: "My Journey",
    href: MY_JOURNEY_HREF,
    matchPrefixes: ["/my", "/account"],
    context: [
      { label: "My Echo", href: MY_ECHO_HREF },
      { label: "Journal", href: JOURNAL_HREF },
      { label: "Milestones", href: MY_JOURNEY_HREF },
      { label: "Account", href: ACCOUNT_HREF },
    ],
  },
];

/** Strips hash/search so path-prefix matching is stable across query strings and anchors. */
function basePath(pathname: string): string {
  return pathname.split("?")[0].split("#")[0];
}

/**
 * Resolves which primary category owns a given pathname, for active-state
 * highlighting on both the primary bar and the context bar. Order matters:
 * PRIMARY_CATEGORIES is checked in order, so a more specific earlier entry
 * (e.g. Begin's "/echo/create") wins over a broader later one (Discover's
 * "/echo/"). Route-driven only -- no hover, no client-only state -- so
 * this resolves identically on first server render and after a refresh
 * or direct deep link.
 */
export function getActiveCategory(pathname: string): EchoPrimaryCategory | undefined {
  const path = basePath(pathname);
  return PRIMARY_CATEGORIES.find((category) =>
    category.matchPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

function parseQuery(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

/**
 * A context link is "active" when its own pathname matches the current
 * pathname AND its query params (if any) are all present and equal in the
 * current URL. Every Echo destination that branches on a query value
 * (Discover's `view`, Practice's `tab`) always encodes that value
 * explicitly in its own href (never a bare path meant as an implicit
 * "default"), so there's no ambiguity between sibling links that share a
 * pathname -- exactly one can ever match at a time.
 */
export function isContextLinkActive(link: EchoContextLink, pathname: string, search: string): boolean {
  const [linkPath, linkQuery] = link.href.split("?");
  if (basePath(pathname) !== linkPath) return false;
  if (!linkQuery) return true;
  const linkParams = new URLSearchParams(linkQuery);
  const currentParams = parseQuery(search);
  for (const [key, value] of linkParams) {
    if (currentParams.get(key) !== value) return false;
  }
  return true;
}
