export interface AuthFooterLinks {
  support?: string
  privacy?: string
  terms?: string
  status?: string
}

export interface AuthFooterProps {
  links: AuthFooterLinks
  className?: string
}

// All hrefs are host-supplied -- this package hardcodes no URLs, so it
// carries no assumption about which domain/product is hosting the page.
export function AuthFooter({ links, className }: AuthFooterProps) {
  return (
    <footer className={className} data-avatark-component="auth-footer">
      <p data-avatark-part="reassurance">Your identity is protected across the AvatarK ecosystem.</p>
      <nav data-avatark-part="links">
        {links.support && <a href={links.support}>Support</a>}
        {links.privacy && <a href={links.privacy}>Privacy</a>}
        {links.terms && <a href={links.terms}>Terms</a>}
        {links.status && <a href={links.status}>System status</a>}
      </nav>
    </footer>
  )
}
