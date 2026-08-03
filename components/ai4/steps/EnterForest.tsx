import { StepFrame } from "@/components/ai4/StepFrame";
import type { StepProps } from "./types";

// One simple pine silhouette, repeated at varying scale/opacity to read as
// depth (nearer = larger + more opaque) without needing any bitmap asset --
// per the brief, only repo-owned/CSS/SVG content, no external imagery.
function TreeGlyph({ scale, opacity }: { scale: number; opacity: number }) {
  return (
    <svg width={40 * scale} height={64 * scale} viewBox="0 0 40 64" aria-hidden="true" style={{ opacity }}>
      <path
        d="M20 2 L34 26 H27 L37 44 H24 L24 62 H16 L16 44 H3 L13 26 H6 Z"
        fill="var(--gold)"
      />
    </svg>
  );
}

const NARRATIVE_ARCS = ["Vrindavan", "Rama's forest exile", "Ayodhya outskirts", "Yamuna river environments", "Sacred groves", "Future original AvatarK stories"];

function StatusRow({ label, tone, items }: { label: string; tone: "now" | "vision"; items: string[] }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: tone === "now" ? "var(--gold)" : "var(--text-dim)" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: tone === "now" ? "var(--gold)" : "var(--surface-line)",
              color: "var(--paper)",
              background: tone === "now" ? "color-mix(in srgb, var(--gold) 14%, transparent)" : "var(--surface)",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EnterForest({ reflection }: StepProps) {
  return (
    <StepFrame kicker="04 · Enter the Living Forest" title="One reusable world. Many stories.">
      <div
        className="relative flex h-40 w-full max-w-2xl items-end justify-center gap-2 overflow-hidden rounded-2xl border px-6 pb-4"
        style={{ borderColor: "var(--surface-line)", background: "linear-gradient(180deg, var(--midnight) 0%, color-mix(in srgb, var(--gold) 6%, var(--midnight)) 100%)" }}
      >
        <TreeGlyph scale={0.65} opacity={0.35} />
        <TreeGlyph scale={0.85} opacity={0.55} />
        <TreeGlyph scale={1.15} opacity={0.85} />
        <span className="motion-breathe absolute h-2 w-2 rounded-full" style={{ background: "var(--gold)", top: "38%", left: "48%" }} />
        <TreeGlyph scale={1} opacity={0.7} />
        <TreeGlyph scale={0.7} opacity={0.4} />
      </div>

      <div className="flex max-w-[560px] flex-col gap-2 text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
        <p>You do not enter another story.</p>
        <p>You return to a living place that remembers.</p>
        <p>Every future story can grow from the same world, changing with memory, participation, and time.</p>
      </div>
      {reflection ? (
        <p className="motion-emerge-instant text-xs font-medium uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          You carry “{reflection}” with you as you enter.
        </p>
      ) : null}

      <div className="grid w-full max-w-xl gap-5 sm:grid-cols-2">
        <StatusRow label="Available now" tone="now" items={["This concept preview", "Reflection continuity"]} />
        <StatusRow label="Future vision" tone="vision" items={NARRATIVE_ARCS} />
      </div>
    </StepFrame>
  );
}
