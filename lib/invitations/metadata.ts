import type { Invitation, InvitationDestination } from "@avatark/invitations";
// Relative imports so this file stays directly runnable under this
// repo's plain `node --test` runner, same as destination.ts.
import { getPracticeBySlug } from "../content/echo.ts";
import type { DestinationPreview } from "./destination.ts";

export interface InvitationAnswer {
  label: string;
  value: string;
}

// The local resolver only ever carries a *product* id in issuedBy (see
// packages/invitations/src/types.ts) -- no person-level inviter identity
// exists in the contract today. Never claim one; just name the product
// honestly.
const ISSUER_DISPLAY_NAMES: Record<string, string> = {
  arenak: "ArenaK",
  echo: "Echo",
  prometheusk: "PrometheusK",
  gamek: "GameK",
  streamk: "StreamK",
  cinemak: "CinemaK",
};

function displayIssuer(issuedBy: string): string {
  return ISSUER_DISPLAY_NAMES[issuedBy] ?? issuedBy.charAt(0).toUpperCase() + issuedBy.slice(1);
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "No expiration set";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "No expiration set";
  return `Open until ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}

function formatUsesRemaining(maxUses: number | null, useCount: number): string | null {
  if (maxUses === null) return null;
  const remaining = Math.max(maxUses - useCount, 0);
  return `${remaining} use${remaining === 1 ? "" : "s"} left`;
}

function whyAnswer(destination: InvitationDestination, preview: DestinationPreview): string {
  switch (destination.type) {
    case "practice":
    case "echo_practice": {
      const practice = getPracticeBySlug(destination.practiceSlug);
      return practice?.whyItMattered || preview.body || "Someone thought this was worth your time.";
    }
    case "echo":
      return preview.body || "Someone thought this was worth your time.";
    default:
      return "Someone thought this was worth your time.";
  }
}

function whatPracticeAnswer(destination: InvitationDestination): string {
  switch (destination.type) {
    case "practice":
    case "echo_practice": {
      const practice = getPracticeBySlug(destination.practiceSlug);
      return practice?.title ?? "Not tied to a specific practice.";
    }
    case "echo":
      return "No specific practice yet — you'll choose one inside.";
    default:
      return "Not tied to a specific practice.";
  }
}

/**
 * Answers the six questions an invitation should answer, honestly, from
 * data that actually exists on the contract -- never a fabricated
 * inviter name, reason, or promise. See lib/invitations/destination.ts
 * for the preview this reuses, and packages/invitations/src/types.ts for
 * the full metadata shape.
 */
export function describeInvitation(invitation: Invitation, preview: DestinationPreview): InvitationAnswer[] {
  const { metadata, destination } = invitation;
  const usesRemaining = formatUsesRemaining(metadata.maxUses, metadata.useCount);
  const howLong = usesRemaining
    ? `${formatExpiry(metadata.expiresAt)} · ${usesRemaining}`
    : formatExpiry(metadata.expiresAt);

  return [
    { label: "Who invited me?", value: `Sent via ${displayIssuer(metadata.issuedBy)}` },
    { label: "Why?", value: whyAnswer(destination, preview) },
    { label: "How long?", value: howLong },
    {
      label: "What happens?",
      value: preview.available ? `${preview.title} — ${preview.body}` : preview.body,
    },
    { label: "What practice?", value: whatPracticeAnswer(destination) },
    {
      label: "What happens after?",
      value: preview.available
        ? "Finishing it hands off to PrometheusK to actually practice — signing in first means it's saved to your Journey; continuing as a guest means it isn't, yet."
        : "This isn't ready to begin yet — nothing happens after until it is.",
    },
  ];
}
