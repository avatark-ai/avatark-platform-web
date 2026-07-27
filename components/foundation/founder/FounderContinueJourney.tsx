import Link from 'next/link'
import { listPractices } from '@/lib/content/echo'
import { practiceDetailHref } from '@/lib/echo/links'
import { ENTER_ECHO_HREF } from '@/lib/content/links'

// RC4: replaces the Founder Letter's single "Enter Echo" button ending with
// a small, lightweight set of equally-weighted next actions -- the letter
// shouldn't end abruptly into one CTA when several natural continuations
// exist. "Read the First Practice" only appears when a real practice
// exists to link to (today, exactly one seed practice) -- never a
// fabricated destination.
export function FounderContinueJourney() {
  const firstPractice = listPractices()[0]
  const actions = [
    { label: 'Explore the Canon', href: '/canon' },
    { label: 'Explore the Ecosystem', href: '/ecosystem' },
    { label: 'Enter Echo', href: ENTER_ECHO_HREF },
    ...(firstPractice ? [{ label: 'Read the First Practice', href: practiceDetailHref(firstPractice.slug) }] : []),
  ]

  return (
    <nav aria-label="Continue the journey" className="mt-10 border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        Continue the Journey
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="link-underline-draw inline-block rounded-sm text-sm font-semibold transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
            >
              {action.label} →
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
