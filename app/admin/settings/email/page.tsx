import { computeEmailDiagnostics } from '@/lib/admin/emailDiagnostics'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-neutral-500">{label}</td>
      <td className="px-3 py-2 font-medium">{value}</td>
    </tr>
  )
}

export default function AdminEmailDiagnosticsPage() {
  const d = computeEmailDiagnostics(process.env)

  return (
    <div className="max-w-xl overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <tbody>
          <Row label="Resend API key" value={d.resendApiKey} />
          <Row label="Sender name" value={d.senderName} />
          <Row label="Sender address" value={d.senderAddress} />
          <Row label="Email sending (feature flag)" value={d.emailSendingEnabled ? 'enabled' : 'disabled'} />
          <Row label="Supabase Auth SMTP (dashboard-configured)" value={d.supabaseSmtp} />
          <Row label="Resend domain verification" value={d.domainVerification} />
          <Row label="Callback URL allowlist" value={d.callbackAllowlist} />
        </tbody>
      </table>
      <p className="border-t px-3 py-2 text-xs text-neutral-500">
        No secret values are ever displayed here, only presence/absence. Rows marked &quot;unknown&quot; require checking
        the Supabase and Resend dashboards directly.
      </p>
    </div>
  )
}
