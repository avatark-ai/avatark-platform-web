import Link from 'next/link'
import { getProductById } from '@avatark/product-registry'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { DepartureLink } from '@avatark/motion'
import { INSTITUTIONAL_SIGNIN_ENABLED } from '@/lib/content/flags'
import { isInstitutionalScope } from '@/lib/release/scope'

const LINK_CLASS =
  'rounded-sm text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
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
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        {title}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
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
            </li>
          ) : (
            <li key={link.label}>
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                {link.label}
              </span>
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

  // Foundation/Canon/Founder/Enter Echo/Sign In already live in the header
  // nav (InstitutionalHeader.tsx) -- this footer stays a closing strip, not
  // a second navigation surface, so it only carries what the header
  // doesn't: the full sibling-product list, and footer-only company links.
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
      <div className="mx-auto max-w-[var(--shell-width)] px-6 py-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <FooterColumn title="Ecosystem" links={ecosystemLinks} />
          <FooterColumn title="Company" links={companyLinks} />
        </div>

        <div className="mt-6 border-t pt-4 text-xs" style={{ borderColor: 'var(--surface-line)', color: 'var(--text-dim)' }}>
          © {new Date().getFullYear()} AvatarK
        </div>
      </div>
    </footer>
  )
}
