import Link from 'next/link'
import { getProductById } from '@avatark/product-registry'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { DepartureLink } from '@avatark/motion'
import { INSTITUTIONAL_SIGNIN_ENABLED } from '@/lib/content/flags'
import { isInstitutionalScope } from '@/lib/release/scope'
import { primaryNavItems } from '@/components/foundation/institutionalNav'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { VISUAL_COPY as V } from '@/lib/content/visualCopy'
import { LIVING_WORLDS_HREF, LIVING_WORLDS_ROUTE_ENABLED } from '@/lib/content/livingWorldsRoute'

// AVK-VISUAL-01B: links also underline on hover and keyboard focus, so they never differ from the
// plain-text entries by colour alone.
const LINK_CLASS =
  'rounded-sm text-sm underline-offset-4 transition-colors hover:text-[var(--gold)] hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--focus-ring)' } as const

interface FooterLink {
  label: string
  href: string | null
  // Plain external link (e.g. mailto:) -- no cross-product departure cue,
  // just a normal <a>.
  external?: boolean
  // A genuine departure to a sibling AvatarK product on its own domain --
  // gets the DepartureLink treatment (see docs/motion-transition-contract.md).
  departure?: boolean
  // AVK-VISUAL-01B (OD-V8): approved readiness status shown after the entry (plain text, not linked).
  status?: string
}

function FooterStatus({ text }: { text: string }) {
  return (
    <span
      className="ml-2 inline-block whitespace-nowrap rounded-full border px-2 text-[0.6875rem] font-semibold leading-5"
      style={{ borderColor: 'var(--surface-line)', color: 'var(--text-dim)' }}
    >
      {text}
    </span>
  )
}

// AVK-VISUAL-01B: each group is a heading plus a list labelled by it, inside the one footer <nav>.
function FooterColumn({ id, title, links }: { id: string; title: string; links: FooterLink[] }) {
  const headingId = `footer-group-${id}`
  return (
    <div>
      <h2 id={headingId} className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        {title}
      </h2>
      <ul aria-labelledby={headingId} className="mt-3 flex flex-col gap-2">
        {links.map((link) =>
          link.href ? (
            <li key={link.label}>
              {link.departure ? (
                <DepartureLink href={link.href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                  {link.label}
                </DepartureLink>
              ) : link.external ? (
                <a href={link.href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                  {link.label}
                </Link>
              )}
              {link.status && <FooterStatus text={link.status} />}
            </li>
          ) : (
            <li key={link.label}>
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                {link.label}
              </span>
              {link.status && <FooterStatus text={link.status} />}
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

// Reuses ecosystemGroups.ts's resolveEcosystemProduct (same helper the
// homepage Ecosystem section and header dropdown use) so Echo gets its
// proper display name and never-a-dead-link discipline instead of a
// second, separately maintained resolver.
//
// Echo's href resolves to /start -- an internal route in this same app,
// not a sibling product's own domain -- so it stays a plain Next <Link>
// (client-side nav); every other product's href is a real cross-domain
// URL and gets the departure treatment.
function ecosystemFooterLink(id: string): FooterLink {
  const product = resolveEcosystemProduct(id)
  const isCrossDomain = product.href?.startsWith('http') ?? false
  return { label: product.name, href: product.href, departure: isCrossDomain }
}

export function InstitutionalFooter() {
  const avatark = getProductById('avatark')
  const supportEmail = avatark?.supportEmail ?? null

  // AVK-VISUAL-01B (OD-V5): four groups -- Institutional, Ecosystem, Living Worlds, Company / Legal --
  // in this DOM and visual order. Institutional reuses the header's primary items (same labels and
  // targets) minus Living Worlds, which has its own group, so no destination is listed twice.
  const institutionalLinks: FooterLink[] = primaryNavItems()
    .filter((item) => item.label !== C['AVK-FR-003'])
    .map((item) => ({ label: item.label, href: item.href }))

  // Unchanged product list and resolver: X-1 decides which entries are links (scopeIProductHref).
  const ecosystemLinks: FooterLink[] = [
    ecosystemFooterLink('echo'),
    ecosystemFooterLink('prometheusk'),
    ecosystemFooterLink('arenak'),
    ecosystemFooterLink('gamek'),
    ecosystemFooterLink('streamk'),
    ecosystemFooterLink('cinemak'),
    ecosystemFooterLink('setpointk'),
    ecosystemFooterLink('atlas'),
    ecosystemFooterLink('studiok'),
  ]

  // AVK-VISUAL-01B (OD-V7/V8): internal Living Worlds routes only. WorldK is plain text with its approved
  // readiness status: no worldk.ai href, no registry entry, no /enter, no Stage A authorization.
  const livingWorldsLinks: FooterLink[] = [
    { label: U['AVK-U03-HN-08'], href: LIVING_WORLDS_ROUTE_ENABLED ? LIVING_WORLDS_HREF : null },
    { label: C['AVK-FR-021'], href: LIVING_WORLDS_ROUTE_ENABLED ? `${LIVING_WORLDS_HREF}#living-forest` : null, status: L['AVK-FLW-ST-01'] },
    { label: C['AVK-FR-055'], href: null, status: L['AVK-FLW-ST-01'] },
  ]

  const companyLinks: FooterLink[] = [
    { label: 'Contact', href: supportEmail ? `mailto:${supportEmail}` : null, external: true },
    // AVK-UNIFICATION-02 (ODR-4): this Privacy link opens the signed-in
    // account tab, so it is only a link while institutional Sign In is on.
    // While off, the label stays as plain text (same treatment as Terms/Trust)
    // rather than leading into sign-in; it is not a public legal notice.
    // AVK-PROD-03C-02a: in Scope I it is plain text whatever the env flag says, because /account
    // is excluded there. Privacy, Terms and Trust stay plain text until a separately authorized gate
    // activates the counsel-approved /privacy and /terms pages (lib/release/legalGate.ts).
    { label: 'Privacy', href: INSTITUTIONAL_SIGNIN_ENABLED && !isInstitutionalScope() ? '/account?tab=privacy' : null },
    // No approved Terms or Trust page exists yet -- same "never a dead link"
    // discipline used elsewhere: plain text rather than a fabricated route.
    { label: 'Terms', href: null },
    { label: 'Trust', href: null },
  ]

  return (
    <footer className="avk-dark-surface" style={{ borderTop: '1px solid var(--surface-line)', background: 'var(--midnight)' }}>
      <div className="mx-auto max-w-[var(--shell-width)] px-6 pt-12 pb-8">
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1fr_1.15fr_1.15fr_1fr] lg:gap-8">
          <FooterColumn id="institutional" title={V['AVK-VIS-FT-01']} links={institutionalLinks} />
          <FooterColumn id="ecosystem" title={U['AVK-U03-HN-04']} links={ecosystemLinks} />
          <FooterColumn id="living-worlds" title={C['AVK-FR-003']} links={livingWorldsLinks} />
          <FooterColumn id="company" title={V['AVK-VIS-FT-02']} links={companyLinks} />
        </nav>

        <div className="mt-6 border-t pt-4 text-xs" style={{ borderColor: 'var(--surface-line)', color: 'var(--text-dim)' }}>
          © {new Date().getFullYear()} AvatarK
        </div>
      </div>
    </footer>
  )
}
