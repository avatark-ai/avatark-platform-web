import Link from 'next/link'
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '@/lib/products/registry'
import { ENTER_ECHO_HREF, INVITATION_HREF, SIGN_IN_HREF, watchFirstHref } from '@/lib/content/links'

const LINK_CLASS =
  'rounded-sm text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

interface FooterLink {
  label: string
  href: string | null
  external?: boolean
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
              {link.external ? (
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

// Same discipline as InstitutionalHeader's Ecosystem panel: a real link
// only when the registry confirms a public, resolvable domain -- plain
// text otherwise, never a dead link.
function ecosystemProductLink(id: string): FooterLink {
  const product = getProductById(id)
  if (!product) return { label: id, href: null }
  const href = product.visibility === 'public' ? resolveProductUrl(product) : null
  return { label: product.displayName, href, external: true }
}

export function InstitutionalFooter() {
  const avatark = getProductById('avatark')
  const supportEmail = avatark?.supportEmail ?? null

  const foundationLinks: FooterLink[] = [
    { label: 'Why AvatarK', href: '/#gap' },
    { label: 'Architecture', href: '/#hero' },
    { label: 'Canon', href: '/#canon' },
    { label: 'Living Spiral', href: '/#living-spiral' },
  ]

  const experienceLinks: FooterLink[] = [
    { label: 'Enter Echo', href: ENTER_ECHO_HREF },
    { label: 'Sign In', href: SIGN_IN_HREF },
    { label: 'Invitation', href: INVITATION_HREF },
    { label: 'Watch First', href: watchFirstHref(), external: true },
  ]

  const ecosystemLinks: FooterLink[] = [
    ecosystemProductLink('prometheusk'),
    ecosystemProductLink('arenak'),
    ecosystemProductLink('gamek'),
    ecosystemProductLink('streamk'),
    ecosystemProductLink('cinemak'),
    ecosystemProductLink('atlas'),
    ecosystemProductLink('studiok'),
  ]

  const companyLinks: FooterLink[] = [
    { label: 'Founder', href: '/founder' },
    { label: 'Roadmap', href: '/roadmap' },
    // No Research page or Contact form exists yet -- Research renders as
    // plain text rather than a dead link; Contact uses the real support
    // address the registry already confirms, not a fabricated form.
    { label: 'Research', href: null },
    { label: 'Contact', href: supportEmail ? `mailto:${supportEmail}` : null, external: true },
  ]

  return (
    <footer style={{ borderTop: '1px solid var(--surface-line)', background: 'var(--midnight)' }}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterColumn title="Foundation" links={foundationLinks} />
          <FooterColumn title="Experience" links={experienceLinks} />
          <FooterColumn title="Ecosystem" links={ecosystemLinks} />
          <FooterColumn title="Company" links={companyLinks} />
        </div>

        <div
          className="mt-10 flex flex-col gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--surface-line)', color: 'var(--text-dim)' }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/account?tab=privacy" className={LINK_CLASS} style={{ color: 'var(--text-dim)', ...FOCUS_STYLE }}>
              Privacy
            </Link>
            <span>Terms</span>
            <span>Accessibility</span>
            <span>Trust</span>
            <span>© {new Date().getFullYear()} AvatarK</span>
          </div>
          <Link
            href={ENTER_ECHO_HREF}
            className="rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--gold)', ...FOCUS_STYLE }}
          >
            Enter Echo →
          </Link>
        </div>
      </div>
    </footer>
  )
}
