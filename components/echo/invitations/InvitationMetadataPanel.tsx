import type { InvitationAnswer } from "@/lib/invitations/metadata";

// Phase 4's "Metadata" step: the six questions an invitation should
// answer (who invited me / why / how long / what happens / what
// practice / what happens after), rendered as a plain label/value
// stack -- same tokens as every other Echo card, no new design system.
export function InvitationMetadataPanel({ answers }: { answers: InvitationAnswer[] }) {
  return (
    <dl className="flex flex-col gap-4 border-t pt-6" style={{ borderColor: "var(--surface-line)" }}>
      {answers.map((answer) => (
        <div key={answer.label} className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            {answer.label}
          </dt>
          <dd className="text-sm leading-6" style={{ color: "var(--paper)" }}>
            {answer.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
