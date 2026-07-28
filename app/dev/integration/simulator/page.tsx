import Link from "next/link";
import type { Metadata } from "next";
import { IntegrationSimulatorView } from "@/components/dev/IntegrationSimulatorView";

export const metadata: Metadata = {
  title: "Integration Simulator — dev",
};

// Integration Sprint RC1's interactive simulator -- pick a scenario and
// auth state, see the exact handoff object at every stage of
// AvatarK -> StreamK -> Prometheus -> Living Echo -> Arena. No network
// request of any kind; everything is computed client-side from
// lib/integrations/simulate.ts. Not linked from any nav.
export default function IntegrationSimulatorPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Integration Sprint RC1 — dev only
        </p>
        <h1 className="text-2xl font-semibold">Integration Simulator</h1>
        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          Choose a scenario and an auth state to see the whole journey, stage by stage. See the{" "}
          <Link href="/dev/integration" className="underline underline-offset-4">
            dashboard
          </Link>{" "}
          for a single-manifest read-out.
        </p>
      </div>
      <IntegrationSimulatorView />
    </main>
  );
}
