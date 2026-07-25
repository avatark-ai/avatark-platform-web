// Shared nav data for EchoHeader's desktop dropdowns and EchoMobileMenu's
// accordions -- one source of truth so the two surfaces can't drift.
// Every href here resolves to a route this pass actually implements (or
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
} from "./links";

export interface EchoNavLink {
  label: string;
  href: string;
  /** Only rendered when this deployment has actually mounted the target (e.g. Account). */
  requiresAccountMount?: boolean;
}

export interface EchoNavSection {
  id: string;
  label: string;
  /** Where clicking the top-level label itself goes (used on mobile, and as the dropdown's first link). */
  href: string;
  links: EchoNavLink[];
  attribution?: string;
}

export const BEGIN_SECTION: EchoNavSection = {
  id: "begin",
  label: "Begin",
  href: START_HERE_HREF,
  links: [
    { label: "What Is an Echo?", href: "/#what-is-an-echo" },
    { label: "Start Here", href: START_HERE_HREF },
    { label: "Enter an Invitation", href: ENTER_INVITATION_HREF },
    { label: "Watch First", href: WATCH_FIRST_HREF },
    { label: "Create My Echo", href: CREATE_MY_ECHO_HREF },
  ],
};

export const TODAY_SECTION: EchoNavSection = {
  id: "today",
  label: "Today",
  href: TODAY_HREF,
  links: [],
};

export const ECHO_NAV_SECTIONS: EchoNavSection[] = [
  {
    id: "discover",
    label: "Discover",
    href: DISCOVER_HREF,
    links: [
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
    links: [
      { label: "Today's Practice", href: TODAY_HREF },
      { label: "Browse Practices", href: `${DISCOVER_HREF}#practices` },
      { label: "My Practice Library", href: `${MY_ECHO_HREF}#practices` },
    ],
    attribution: "Powered by PrometheusK",
  },
  {
    id: "community",
    label: "Community",
    href: COMMUNITY_HREF,
    links: [
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
    links: [
      { label: "Watch", href: `${STORIES_HREF}#watch` },
      { label: "Episodes", href: `${STORIES_HREF}#episodes` },
      { label: "Live", href: `${STORIES_HREF}#live` },
      { label: "Films", href: `${STORIES_HREF}#films` },
      { label: "Creators", href: `${STORIES_HREF}#creators` },
    ],
    attribution: "Powered by StreamK and CinemaK",
  },
  {
    id: "my-journey",
    label: "My Journey",
    href: MY_JOURNEY_HREF,
    links: [
      { label: "My Echo", href: MY_ECHO_HREF },
      { label: "Today", href: TODAY_HREF },
      { label: "Journal", href: JOURNAL_HREF },
      { label: "Progress", href: MY_JOURNEY_HREF },
      { label: "Account", href: ACCOUNT_HREF, requiresAccountMount: true },
    ],
  },
];
