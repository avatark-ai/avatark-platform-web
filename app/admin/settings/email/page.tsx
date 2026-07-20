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
    <div className="max-w-xl space-y-4">
      <div
        className={`rounded-md border px-4 py-3 text-sm ${d.testReadiness ? 'border-green-300 bg-green-50 text-green-900' : 'border-neutral-300 bg-neutral-50 text-neutral-700'}`}
      >
        Test readiness: {d.testReadiness ? 'ready to send' : 'not ready'}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <tbody>
            <Row label="Resend API key" value={d.resendApiKey} />
            <Row label="Sender name" value={d.senderName} />
            <Row label="Sender address" value={d.senderAddress} />
            <Row label="Sender preview" value={d.senderPreview ?? 'unavailable'} />
            <Row label="Sending domain" value={d.senderDomain ?? 'unknown'} />
            <Row label="Email sending (feature flag)" value={d.emailSendingEnabled ? 'enabled' : 'disabled'} />
            <Row label="Supabase Auth SMTP (dashboard-configured)" value={d.supabaseSmtp} />
            <Row label="Resend domain verification" value={d.domainVerification} />
            <Row label="SPF" value={d.spf} />
            <Row label="DKIM" value={d.dkim} />
            <Row label="Callback URL allowlist" value={d.callbackAllowlist} />
          </tbody>
        </table>
        <p className="border-t px-3 py-2 text-xs text-neutral-500">
          No secret values are ever displayed here, only presence/absence. Rows marked &quot;unknown&quot; require checking
          the Supabase and Resend dashboards directly.
        </p>
      </div>

      <div className="rounded-md border p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Templates</h3>
        <ul className="list-inside list-disc text-sm text-neutral-600">
          {d.templates.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          Magic-link and email-verification templates are not here — those are rendered and sent by Supabase Auth&apos;s own
          SMTP relay.
        </p>
      </div>

      {d.missing.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Missing configuration</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-900">
            {d.missing.map((m) => (
              <li key={m}>
                <code>{m}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
