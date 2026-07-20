import Link from 'next/link'

const PANELS = [
  { href: '/admin/settings/email', label: 'Email diagnostics', detail: 'Resend/SMTP configuration completeness' },
  { href: '/admin/settings/auth', label: 'Auth diagnostics', detail: 'Supabase + Google OAuth configuration state' },
  { href: '/admin/settings/environment', label: 'Environment health', detail: 'Local / test / preview / production status' },
  { href: '/admin/support', label: 'Support', detail: 'Platform support contact and escalation' },
]

export default function AdminSettingsPage() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {PANELS.map((panel) => (
        <Link key={panel.href} href={panel.href} className="rounded-md border p-4 hover:bg-neutral-50">
          <div className="font-semibold">{panel.label}</div>
          <div className="mt-1 text-sm text-neutral-500">{panel.detail}</div>
        </Link>
      ))}
    </div>
  )
}
