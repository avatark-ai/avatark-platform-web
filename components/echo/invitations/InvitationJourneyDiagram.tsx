// A small, static answer to "what happens after I accept" -- not the
// animated ecosystem/landing diagrams (PlatformDiagram, FourAxesGeometry
// etc.), which are AvatarK-brand visuals out of scope here. Plain CSS
// timeline, same tokens as every other Echo card.
const STEPS = [
  { id: "invited", label: "Invited", description: "Someone sent you this link." },
  {
    id: "preview",
    label: "Preview",
    description: "See who invited you, why, and what it leads to — that's this page.",
  },
  { id: "accept", label: "Accept", description: "Continue as a guest, or sign in first to save your progress." },
  {
    id: "practice",
    label: "Watch First / Practice",
    description: "A short framing story (StreamK), then the practice itself.",
  },
  {
    id: "continue",
    label: "Continue on PrometheusK",
    description: "Finishing the practice hands off to PrometheusK.",
  },
] as const;

export type InvitationJourneyStep = (typeof STEPS)[number]["id"];

export function InvitationJourneyDiagram({ currentStep = "preview" }: { currentStep?: InvitationJourneyStep }) {
  return (
    <ol className="flex flex-col">
      {STEPS.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isLast = index === STEPS.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className="h-3 w-3 flex-none rounded-full"
                style={{ background: isCurrent ? "var(--gold)" : "var(--surface-line)" }}
                aria-hidden="true"
              />
              {!isLast && (
                <span className="w-px flex-1" style={{ background: "var(--surface-line)" }} aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold" style={{ color: isCurrent ? "var(--gold)" : "var(--paper)" }}>
                {step.label}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-dim)" }}>
                    — you are here
                  </span>
                )}
              </p>
              <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
