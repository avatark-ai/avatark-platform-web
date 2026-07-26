import Link from 'next/link'
import { getProductById } from '@avatark/product-registry'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { ENTER_ECHO_HREF, SIGN_IN_HREF } from '@/lib/content/links'

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

// Reuses ecosystemGroups.ts's resolveEcosystemProduct (same helper the
// homepage Ecosystem section and header dropdown use) so Echo gets its
// proper display name and never-a-dead-link discipline instead of a
// second, separately maintained resolver.
function ecosystemFooterLink(id: string): FooterLink {
  const product = resolveEcosystemProduct(id)
  return { label: product.name, href: product.href, external: true }
}

export function InstitutionalFooter() {
  const avatark = getProductById('avatark')
  const supportEmail = avatark?.supportEmail ?? null

  const foundationLinks: FooterLink[] = [
    { label: 'Why AvatarK', href: '/#gap' },
    { label: 'Canon', href: '/#canon' },
    { label: 'Founder Letter', href: '/founder' },
  ]

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

  const experienceLinks: FooterLink[] = [
    { label: 'Enter Echo', href: ENTER_ECHO_HREF },
    { label: 'Sign In', href: SIGN_IN_HREF },
  ]

  const companyLinks: FooterLink[] = [
    { label: 'Contact', href: supportEmail ? `mailto:${supportEmail}` : null, external: true },
    { label: 'Privacy', href: '/account?tab=privacy' },
    // No Terms or Trust page exists yet -- same "never a dead link"
    // discipline used elsewhere: plain text rather than a fabricated route.
    { label: 'Terms', href: null },
    { label: 'Trust', href: null },
  ]

  return (
    <footer style={{ borderTop: '1px solid var(--surface-line)', background: 'var(--midnight)' }}>
      <div className="mx-auto max-w-[var(--shell-width)] px-6 py-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterColumn title="Foundation" links={foundationLinks} />
          <FooterColumn title="Ecosystem" links={ecosystemLinks} />
          <FooterColumn title="Experience" links={experienceLinks} />
          <FooterColumn title="Company" links={companyLinks} />
        </div>

        <div className="mt-6 border-t pt-4 text-xs" style={{ borderColor: 'var(--surface-line)', color: 'var(--text-dim)' }}>
          © {new Date().getFullYear()} AvatarK
        </div>
      </div>
    </footer>
  )
}
