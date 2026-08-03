import { StepFrame } from "@/components/ai4/StepFrame";

// The architecture reveal: same node/connector idiom as Continue.tsx's
// 3-node diagram, extended into a vertical tree. Deliberately names the
// concept layer (Living Worlds, GameK's four dimensions, PrometheusK as
// knowledge layer) and nothing else -- no product marketing pages, no
// individual product routes.
function Connector() {
  return <span aria-hidden="true" className="h-6 w-px" style={{ background: "var(--gold)", opacity: 0.5 }} />;
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

function Pill({ label }: { label: string }) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-medium"
      style={{ borderColor: "var(--surface-line)", color: "var(--paper)", background: "var(--surface)" }}
    >
      {label}
    </span>
  );
}

const LIVING_WORLD_NAMES = ["Living Symphony", "Living Stillness", "Living Vrindavan", "Living Forest", "Living Forge"];

const GAMEK_DIMENSIONS = [
  { name: "FlowK", sublabel: "Behavior" },
  { name: "PathK", sublabel: "Growth" },
  { name: "GeometryK", sublabel: "Structure" },
  { name: "ChronicleK", sublabel: "Memory" },
];

const PROMETHEUSK_LAYERS = ["Reflection", "Practice", "Creation", "Echo", "Legacy"];

export function PlatformArchitecture() {
  return (
    <StepFrame
      kicker="08 · Platform Architecture"
      title="Every world you just saw runs on the same engine."
      subtitle="Not six products — one platform, expressed differently in every story."
    >
      <div className="flex w-full max-w-2xl flex-col items-center">
        <NodeLabel label="AvatarK" />
        <Connector />
        <NodeLabel label="Living Worlds" />
        <Connector />
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {LIVING_WORLD_NAMES.map((name) => (
            <Pill key={name} label={name} />
          ))}
        </div>
        <Connector />
        <NodeLabel label="GameK" sublabel="How every world is built" />
        <Connector />
        <div className="flex flex-wrap justify-center gap-4">
          {GAMEK_DIMENSIONS.map(({ name, sublabel }) => (
            <div key={name} className="flex flex-col items-center gap-1 rounded-xl border px-3 py-2" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
                {name}
              </span>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                {sublabel}
              </span>
            </div>
          ))}
        </div>
        <Connector />
        <NodeLabel label="PrometheusK" sublabel="The knowledge layer" />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm font-medium" style={{ color: "var(--text-dim)" }}>
          {PROMETHEUSK_LAYERS.map((layer, index) => (
            <span key={layer} className="flex items-center gap-2">
              <span style={{ color: "var(--paper)" }}>{layer}</span>
              {index < PROMETHEUSK_LAYERS.length - 1 ? <span aria-hidden="true" style={{ color: "var(--gold)" }}>→</span> : null}
            </span>
          ))}
        </div>
      </div>
    </StepFrame>
  );
}
