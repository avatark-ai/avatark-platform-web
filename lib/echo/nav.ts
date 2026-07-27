// Echo's primary navigation model -- a fixed, two-level structure: six
// primary categories always visible in the header, each with its own set
// of contextual destinations shown in a second bar beneath it. Shared by
// EchoHeader (desktop primary bar + mobile accordion) and EchoContextNav
// (desktop/tablet context bar), so the two surfaces can't drift.
//
// Replaces the previous single-level dropdown model (EchoNavSection),
// which this pass rejected: a large overlay panel covering page content.
// Every href here resolves to a route this repo actually implements (or
// an anchor on one of those routes); nothing here is a placeholder link.
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
      { label: "Featured Echoes", href: `${DISCOVER_HREF}#echoes` },
      { label: "Featured Practices", href: `${DISCOVER_HREF}#practices` },
      { label: "Collections", href: `${DISCOVER_HREF}#collections` },
      { label: "Topics", href: `${DISCOVER_HREF}#themes` },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    href: TODAY_HREF,
    matchPrefixes: ["/today", "/practice", "/journey"],
    context: [
      { label: "Today", href: TODAY_HREF },
      { label: "Browse", href: `${DISCOVER_HREF}#practices` },
      { label: "My Library", href: `${MY_ECHO_HREF}#practices` },
    ],
    attribution: "Powered by PrometheusK",
  },
  {
    id: "community",
    label: "Community",
    href: COMMUNITY_HREF,
    matchPrefixes: ["/community"],
    context: [
      { label: "Challenges", href: `${COMMUNITY_HREF}#challenges` },
      { label: "Groups", href: `${COMMUNITY_HREF}#groups` },
      { label: "Events", href: `${COMMUNITY_HREF}#events` },
      { label: "Cohorts", href: `${COMMUNITY_HREF}#cohorts` },
      { label: "Recognition", href: `${COMMUNITY_HREF}#recognition` },
    ],
    attribution: "Powered by ArenaK",
  },
  {
    id: "stories",
    label: "Stories",
    href: STORIES_HREF,
    matchPrefixes: ["/stories"],
    context: [
      { label: "Watch", href: `${STORIES_HREF}#watch` },
      { label: "Episodes", href: `${STORIES_HREF}#episodes` },
      { label: "Live", href: `${STORIES_HREF}#live` },
      { label: "Films", href: `${STORIES_HREF}#films` },
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
      { label: "Progress", href: MY_JOURNEY_HREF },
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

/**
 * A context link is "active" when its own pathname matches the current
 * pathname AND (it carries no hash, or its hash matches the current one).
 * Anchor-only siblings on the same page (e.g. Discover's four `#`
 * destinations) intentionally never all light up at once -- only the one
 * matching the current hash does, once the caller tracks hash changes.
 */
export function isContextLinkActive(link: EchoContextLink, pathname: string, hash: string): boolean {
  const [linkPath, linkHash] = link.href.split("#");
  if (basePath(pathname) !== linkPath) return false;
  if (!linkHash) return true;
  return linkHash === hash.replace(/^#/, "");
}
