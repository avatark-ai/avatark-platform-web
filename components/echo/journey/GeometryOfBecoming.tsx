import { RevealOnView } from "@/components/motion/RevealOnView";

// Richer placeholder for a not-yet-built feature -- no backend logic, no
// invented analytics. Explains the vision in the platform's own words and
// pairs it with a static illustration that reuses the Canon's geometric
// visual language (thin gold strokes, concentric figures around a center)
// rather than a chart or graph, since there is no real data behind this
// yet. Lives on My Journey because the copy ("Your Echo is more than a
// profile") speaks directly to the individual's own journey, not the
// abstract Canon architecture.
function GeometryIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="h-auto w-full max-w-xs"
      role="img"
      aria-label="An abstract geometric emblem of concentric forms, representing a journey whose shape is still forming"
    >
      <g fill="none" stroke="var(--gold)" strokeLinejoin="round" opacity="0.85">
        <rect x="130" y="70" width="60" height="60" strokeWidth="1.25" transform="rotate(45 160 100)" opacity="0.9" />
        <rect x="105" y="45" width="110" height="110" strokeWidth="1" transform="rotate(15 160 100)" opacity="0.6" />
        <circle cx="160" cy="100" r="82" strokeWidth="0.75" opacity="0.35" />
      </g>
      <circle cx="160" cy="100" r="3" fill="var(--gold)" />
    </svg>
  );
}

export function GeometryOfBecoming() {
  return (
    <RevealOnView
      className="motion-emerge mt-8 flex flex-col items-center gap-8 rounded-2xl border p-8 text-center sm:p-10 lg:flex-row lg:gap-12 lg:text-left"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Geometry of Becoming
        </p>
        <p className="mt-3 text-lg leading-8" style={{ color: "var(--paper)" }}>
          Your Echo is more than a profile.
        </p>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-dim)" }}>
          Every practice, every reflection, every invitation, every contribution gradually changes the geometry of
          your journey. Over time, AvatarK will visualize this geometry as a living representation of how your
          awareness, wisdom, responsibility, and creation evolve together.
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Coming in a future release
        </p>
      </div>
      <div className="flex w-full justify-center lg:w-auto">
        <GeometryIllustration />
      </div>
    </RevealOnView>
  );
}
