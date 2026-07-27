import type { Invitation, InvitationStatus } from "./types.ts";

/**
 * Pure status classification -- `now` is a parameter (not read
 * internally) so this stays unit-testable without mocking the clock.
 * Mirrors the same pattern avatark-platform-web's own
 * lib/organizations/invitations.ts already uses for a different
 * (organization-membership) invitation concept -- same shape of
 * problem, kept as two separate types since the domains don't overlap.
 *
 * `invitation.status` is trusted as the resolver's own classification
 * for revoked/invalid (those require producer-side knowledge this
 * package can't derive), but expired/exhausted are always independently
 * re-derived here from `metadata` -- a resolver returning a stale
 * `status: "pending"` for a since-expired invitation must never be
 * trusted blindly.
 */
export function classifyInvitationStatus(invitation: Invitation, now: Date): InvitationStatus {
  if (invitation.status === "revoked") return "revoked";
  if (invitation.status === "invalid") return "invalid";
  if (invitation.status === "accepted") return "accepted";

  const { expiresAt, maxUses, useCount } = invitation.metadata;
  if (expiresAt && new Date(expiresAt).getTime() < now.getTime()) return "expired";
  if (maxUses !== null && useCount >= maxUses) return "exhausted";
  return "pending";
}

/** True only for an invitation a consumer may still act on. */
export function isInvitationUsable(invitation: Invitation, now: Date): boolean {
  return classifyInvitationStatus(invitation, now) === "pending";
}
