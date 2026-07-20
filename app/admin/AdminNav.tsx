'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/settings', label: 'Settings' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-3 text-sm">
      {LINKS.map((link) => {
        const active = link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 font-medium ${active ? 'bg-black text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
