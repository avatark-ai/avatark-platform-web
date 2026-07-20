import { computeAuthDiagnostics } from '@/lib/admin/authDiagnostics'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-neutral-500">{label}</td>
      <td className="px-3 py-2 font-medium">{value}</td>
    </tr>
  )
}

export default function AdminAuthDiagnosticsPage() {
  const d = computeAuthDiagnostics(process.env)

  return (
    <div className="max-w-xl space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <tbody>
            <Row label="Supabase URL" value={d.supabaseUrl} />
            <Row label="Supabase anon key" value={d.supabaseAnonKey} />
            <Row label="Service role key (admin features)" value={d.serviceRoleKey} />
            <Row label="Magic link sign-in" value="enabled" />
            <Row label="Google OAuth (feature flag)" value={d.googleOAuthEnabled ? 'enabled' : 'disabled'} />
            <Row label="Google OAuth provider credentials" value={d.googleOAuthCredentialsConfigured} />
            <Row label="Supabase Auth SMTP (dashboard-configured)" value={d.smtpConfigured} />
            <Row label="Auth callback route implemented" value={d.callbackImplemented ? 'yes' : 'no'} />
            <Row label="Redirect URL for this environment" value={d.redirectUrl ?? 'unknown — set NEXT_PUBLIC_PLATFORM_ORIGIN'} />
            <Row label="Redirect URL registered in Supabase allowlist" value={d.callbackAllowlistStatus} />
            <Row label="Session refresh mechanism" value={d.sessionRefreshMechanism} />
          </tbody>
        </table>
        <p className="border-t px-3 py-2 text-xs text-neutral-500">No secret values are ever displayed here, only presence/absence and feature-flag state.</p>
      </div>

      {d.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Missing configuration</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-900">
            {d.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
