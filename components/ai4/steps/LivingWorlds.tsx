import { StepFrame } from "@/components/ai4/StepFrame";

// Every AvatarK story becomes its own persistent world, sharing one
// architecture. This step deliberately shows the worlds, not the products
// that build them -- no product marketing, just the shape of the idea.
const LIVING_WORLDS = [
  { story: "Between Heartbeats", world: "Living Symphony", theme: "Becoming" },
  { story: "Adhi Yogi", world: "Living Stillness", theme: "Awakening" },
  { story: "Krishna", world: "Living Vrindavan", theme: "Joy & Love" },
  { story: "Rama", world: "Living Forest", theme: "Dharma & Character" },
  { story: "Prometheus", world: "Living Forge", theme: "Creation & Legacy" },
] as const;

export function LivingWorlds() {
  return (
    <StepFrame
      kicker="05 · Living Worlds"
      title="One platform. Many living worlds."
      subtitle="Every AvatarK story becomes its own persistent world."
    >
      <div className="motion-emerge-stagger is-revealed flex w-full max-w-4xl flex-wrap justify-center gap-4">
        {LIVING_WORLDS.map(({ story, world, theme }) => (
          <div
            key={story}
            className="flex w-56 flex-col gap-2 rounded-2xl border p-6 text-left"
            style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
          >
            <p className="text-lg font-semibold leading-snug" style={{ color: "var(--paper)" }}>
              {story}
            </p>
            <p className="text-sm font-medium" style={{ color: "var(--gold)" }}>
              {world}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
              Theme
            </p>
            <p className="text-sm font-medium" style={{ color: "var(--paper)" }}>
              {theme}
            </p>
          </div>
        ))}
      </div>
    </StepFrame>
  );
}
