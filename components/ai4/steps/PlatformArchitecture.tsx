import { StepFrame } from "@/components/ai4/StepFrame";

// The architecture reveal: same node/connector idiom as Continue.tsx's
// 3-node diagram, extended into a vertical tree. Deliberately trimmed to
// exactly the nodes the Phase 5 brief names -- AvatarK, Living Worlds,
// GameK's four dimensions, PrometheusK -- and nothing past that: no
// per-world names (Living Worlds already has its own step), no
// PrometheusK sub-layers, no StudioK/ArenaK/StreamK/other product or
// internal-service names.
function Connector() {
  return <span aria-hidden="true" className="h-8 w-px" style={{ background: "var(--gold)", opacity: 0.5 }} />;
}

function NodeLabel({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="rounded-full border px-4 py-1.5 text-sm font-semibold"
        style={{ borderColor: "var(--gold)", color: "var(--paper)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
      >
        {label}
      </span>
      {sublabel ? (
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}

const GAMEK_DIMENSIONS = [
  { name: "FlowK", sublabel: "How you move" },
  { name: "PathK", sublabel: "Where you are going" },
  { name: "GeometryK", sublabel: "Why the world feels coherent" },
  { name: "ChronicleK", sublabel: "What is remembered" },
];

export function PlatformArchitecture() {
  return (
    <StepFrame
      kicker="08 · Platform Architecture"
      title="One platform. Infinite stories."
      subtitle="Every story becomes a living world. Every living world is built from the same platform."
    >
      <div className="flex w-full max-w-2xl flex-col items-center py-2">
        <NodeLabel label="AvatarK" />
        <Connector />
        <NodeLabel label="Living Worlds" />
        <Connector />
        <NodeLabel label="GameK" sublabel="How every world is built" />
        <Connector />
        <div className="motion-emerge-stagger is-revealed flex flex-wrap justify-center gap-5">
          {GAMEK_DIMENSIONS.map(({ name, sublabel }) => (
            <div
              key={name}
              className="flex w-36 flex-col items-center gap-1 rounded-xl border px-4 py-3 text-center"
              style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
                {name}
              </span>
              <span className="text-xs leading-snug" style={{ color: "var(--text-dim)" }}>
                {sublabel}
              </span>
            </div>
          ))}
        </div>
        <Connector />
        <NodeLabel label="PrometheusK" sublabel="What humanity creates next" />
      </div>
    </StepFrame>
  );
}
