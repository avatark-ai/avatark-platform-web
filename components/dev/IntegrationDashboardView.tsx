import type { DashboardView } from "@/lib/integrations/dashboard";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
        {label}
      </dt>
      <dd className="text-sm" style={{ color: "var(--paper)" }}>
        {children}
      </dd>
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre
      className="overflow-x-auto rounded-lg border p-3 text-xs leading-5"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)", color: "var(--paper)" }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// The Integration Dashboard's 6 required fields, read straight off a
// DashboardView (lib/integrations/dashboard.ts) -- no computation here,
// this component only renders what describeDashboard already decided.
export function IntegrationDashboardView({ view }: { view: DashboardView }) {
  return (
    <dl className="flex flex-col gap-5">
      <Field label="Journey Manifest">
        <Json value={view.manifest} />
      </Field>
      <Field label="Current Product">{view.currentProduct}</Field>
      <Field label="Current Step">{view.currentStep}</Field>
      <Field label="Next Product(s)">
        {view.nextOptions.length === 0
          ? "n/a -- terminal step"
          : view.nextOptions.map((option) => `${option.product} (${option.step})`).join(", ")}
      </Field>
      <Field label="Next Handoff(s)">
        {view.nextOptions.length === 0 ? (
          "n/a -- terminal step"
        ) : (
          <div className="flex flex-col gap-3">
            {view.nextOptions.map((option) => (
              <div key={option.step} className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                  → {option.step} ({option.product})
                </span>
                {option.crossesBoundary ? <Json value={option.handoff} /> : <span className="text-xs">n/a -- stays within {option.product}</span>}
              </div>
            ))}
          </div>
        )}
      </Field>
      <Field label="Current Status">
        <span style={{ color: view.status.source === "recovery" ? "var(--gold)" : "var(--paper)" }}>
          {view.status.message}
        </span>
      </Field>
    </dl>
  );
}
