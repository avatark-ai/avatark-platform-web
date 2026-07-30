// A concise, one-line answer to "how does this all fit together" -- not
// one of the animated institutional ecosystem diagrams (PlatformDiagram
// etc.), which live on the AvatarK marketing site and are out of scope
// here. Shown on Begin, Community and Invitation pages -- the three
// places a visitor is most likely to wonder which product is doing what.
const FLOW = [
  { name: "StudioK", verb: "creates" },
  { name: "StreamK", verb: "publishes" },
  { name: "AvatarK", verb: "welcomes" },
  { name: "PrometheusK", verb: "develops practice" },
  { name: "ArenaK", verb: "connects people" },
  { name: "StreamK", verb: "shares stories" },
] as const;

export function EcosystemFlow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        How the ecosystem fits together
      </p>
      <p className="text-sm leading-7" style={{ color: "var(--text-dim)" }}>
        {FLOW.map((step, index) => (
          <span key={`${step.name}-${index}`}>
            <span className="font-semibold" style={{ color: "var(--paper)" }}>
              {step.name}
            </span>{" "}
            {step.verb}
            {index < FLOW.length - 1 && (
              <span aria-hidden="true" style={{ color: "var(--gold)" }}>
                {" "}
                →{" "}
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
