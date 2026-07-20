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
    <div className="max-w-xl overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <tbody>
          <Row label="Supabase URL" value={d.supabaseUrl} />
          <Row label="Supabase anon key" value={d.supabaseAnonKey} />
          <Row label="Service role key (admin features)" value={d.serviceRoleKey} />
          <Row label="Google OAuth (feature flag)" value={d.googleOAuthEnabled ? 'enabled' : 'disabled'} />
          <Row label="Google OAuth provider credentials" value={d.googleOAuthCredentialsConfigured} />
          <Row label="Session refresh mechanism" value={d.sessionRefreshMechanism} />
        </tbody>
      </table>
      <p className="border-t px-3 py-2 text-xs text-neutral-500">No secret values are ever displayed here, only presence/absence and feature-flag state.</p>
    </div>
  )
}
