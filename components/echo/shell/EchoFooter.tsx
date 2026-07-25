import Link from "next/link";
import {
  ACCOUNT_HREF,
  ARCHITECTURE_HREF,
  COMMUNITY_HREF,
  CREATE_MY_ECHO_HREF,
  DISCOVER_HREF,
  ECOSYSTEM_HREF,
  ENTER_INVITATION_HREF,
  FOUNDER_LETTER_HREF,
  JOURNAL_HREF,
  MY_ECHO_HREF,
  MY_JOURNEY_HREF,
  START_HERE_HREF,
  STORIES_HREF,
  TODAY_HREF,
  WATCH_FIRST_HREF,
  WHY_AVATARK_HREF,
} from "@/lib/echo/links";

const LINK_CLASS =
  "rounded-sm text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === "true";

interface FooterLink {
  label: string;
  href: string | null;
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
        {title}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.label}>
            {link.href ? (
              <Link href={link.href} className={LINK_CLASS} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
                {link.label}
              </Link>
            ) : (
              <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                {link.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EchoFooter() {
  const beginLinks: FooterLink[] = [
    { label: "Start Here", href: START_HERE_HREF },
    { label: "Enter Invitation", href: ENTER_INVITATION_HREF },
    { label: "Watch First", href: WATCH_FIRST_HREF },
    { label: "Create My Echo", href: CREATE_MY_ECHO_HREF },
  ];

  const discoverLinks: FooterLink[] = [
    { label: "Featured Echoes", href: `${DISCOVER_HREF}#echoes` },
    { label: "Practices", href: `${DISCOVER_HREF}#practices` },
    { label: "Stories", href: `${DISCOVER_HREF}#stories` },
    { label: "Collections", href: `${DISCOVER_HREF}#collections` },
  ];

  const practiceLinks: FooterLink[] = [
    { label: "Today", href: TODAY_HREF },
    { label: "Browse", href: `${DISCOVER_HREF}#practices` },
    { label: "My Library", href: `${MY_ECHO_HREF}#practices` },
  ];

  const communityLinks: FooterLink[] = [
    { label: "Challenges", href: `${COMMUNITY_HREF}#challenges` },
    { label: "Groups", href: `${COMMUNITY_HREF}#groups` },
    { label: "Events", href: `${COMMUNITY_HREF}#events` },
    { label: "Cohorts", href: `${COMMUNITY_HREF}#cohorts` },
  ];

  const storiesLinks: FooterLink[] = [
    { label: "Watch", href: `${STORIES_HREF}#watch` },
    { label: "Episodes", href: `${STORIES_HREF}#episodes` },
    { label: "Live", href: `${STORIES_HREF}#live` },
    { label: "Films", href: `${STORIES_HREF}#films` },
  ];

  const myJourneyLinks: FooterLink[] = [
    { label: "My Echo", href: MY_ECHO_HREF },
    { label: "Journal", href: JOURNAL_HREF },
    { label: "Progress", href: MY_JOURNEY_HREF },
    { label: "Account", href: ACCOUNT_MOUNT_ENABLED ? ACCOUNT_HREF : null },
  ];

  const avatarkLinks: FooterLink[] = [
    { label: "Why AvatarK", href: WHY_AVATARK_HREF },
    { label: "Founder Letter", href: FOUNDER_LETTER_HREF },
    { label: "Architecture", href: ARCHITECTURE_HREF },
    { label: "Ecosystem", href: ECOSYSTEM_HREF },
  ];

  return (
    <footer style={{ borderTop: "1px solid var(--surface-line)", background: "var(--midnight)" }}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 max-w-md">
          <p className="text-base font-semibold tracking-tight" style={{ color: "var(--paper)" }}>
            ECHO
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            Every life leaves something worth carrying forward.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          <FooterColumn title="Begin" links={beginLinks} />
          <FooterColumn title="Discover" links={discoverLinks} />
          <FooterColumn title="Practice" links={practiceLinks} />
          <FooterColumn title="Community" links={communityLinks} />
          <FooterColumn title="Stories" links={storiesLinks} />
          <FooterColumn title="My Journey" links={myJourneyLinks} />
          <FooterColumn title="AvatarK" links={avatarkLinks} />
        </div>

        <div
          className="mt-10 flex flex-col gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--surface-line)", color: "var(--text-dim)" }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/account?tab=privacy" className={LINK_CLASS} style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}>
              Privacy
            </Link>
            <span>Terms</span>
            <span>Trust</span>
            <span>Accessibility</span>
            <span>© {new Date().getFullYear()} AvatarK</span>
          </div>
          <Link
            href={START_HERE_HREF}
            className="rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", ...FOCUS_STYLE }}
          >
            Begin My Echo →
          </Link>
        </div>
      </div>
    </footer>
  );
}
