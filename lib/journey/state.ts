import { isIntentionId, type IntentionId } from "@/lib/onboarding/intentions";
import { createClient } from "@/lib/supabase/client";
import { shouldSkipInvitationAcceptance } from "@avatark/journey";

export interface JourneyContext {
  intention: IntentionId | null;
  witness: string | null;
  startedAt: string | null;
  lastSeenAt: string | null;
  // RC5 -- set only after a signed completion receipt from PrometheusK
  // has been verified server-side (see lib/onboarding/receipt.ts and
  // app/continue/page.tsx). Never set from a client-supplied flag.
  practiceCompletedAt: string | null;
  // Set only once, by recordInvitationAcceptance below, the first time a
  // signed-in visitor accepts a given invitation token (see
  // lib/invitations/). Preserves lineage (Invitation -> Echo -> Practice
  // -> Completion -> Journey) without a second, invitation-specific
  // table -- same convention as every other JourneyContext field.
  invitationId: string | null;
  invitationAcceptedAt: string | null;
}

export const EMPTY_JOURNEY_CONTEXT: JourneyContext = {
  intention: null,
  witness: null,
  startedAt: null,
  lastSeenAt: null,
  practiceCompletedAt: null,
  invitationId: null,
  invitationAcceptedAt: null,
};

// auth.users.user_metadata is Supabase's own existing, always-present
// per-user store -- reused here instead of a new table so Journey
// continuity needs zero migrations. Only this app ever writes to it
// (via supabase.auth.updateUser below), so it's safe to treat as
// canonical rather than fabricated.
function readRaw(metadata: unknown): Partial<Record<keyof JourneyContext, unknown>> {
  if (!metadata || typeof metadata !== "object") return {};
  const journey = (metadata as Record<string, unknown>).journey;
  if (!journey || typeof journey !== "object") return {};
  return journey as Partial<Record<keyof JourneyContext, unknown>>;
}

export function readJourneyContext(metadata: unknown): JourneyContext {
  const raw = readRaw(metadata);
  const intention = typeof raw.intention === "string" ? raw.intention : null;
  return {
    intention: isIntentionId(intention) ? intention : null,
    witness: typeof raw.witness === "string" ? raw.witness : null,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
    lastSeenAt: typeof raw.lastSeenAt === "string" ? raw.lastSeenAt : null,
    practiceCompletedAt: typeof raw.practiceCompletedAt === "string" ? raw.practiceCompletedAt : null,
    invitationId: typeof raw.invitationId === "string" ? raw.invitationId : null,
    invitationAcceptedAt: typeof raw.invitationAcceptedAt === "string" ? raw.invitationAcceptedAt : null,
  };
}

type SupabaseAuthClient = ReturnType<typeof createClient>;

// Same defensive shape as resolveClientPrincipal: supabase-js auth calls
// have been observed to hang indefinitely in this environment, so every
// call here races a real timeout rather than trusting the promise to
// settle on its own.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out ${label} (${ms}ms).`)), ms)
    ),
  ]);
}

// Merges a freshly-arrived intention/witness (usually just carried in
// off the onboarding query string) into the canonical context, writing
// through to user_metadata. Never clears a field that isn't present in
// `next` -- absence means "unchanged," not "forget this."
export async function recordIntentionContext(
  supabase: SupabaseAuthClient,
  current: JourneyContext,
  next: { intention: string | null; witness: string | null }
): Promise<JourneyContext> {
  const intention = isIntentionId(next.intention) ? next.intention : current.intention;
  const witness = next.witness ?? current.witness;

  const unchanged = intention === current.intention && witness === current.witness;
  if (unchanged && current.startedAt) return current;

  const merged: JourneyContext = {
    intention,
    witness,
    startedAt: current.startedAt ?? new Date().toISOString(),
    lastSeenAt: current.lastSeenAt,
    practiceCompletedAt: current.practiceCompletedAt,
    invitationId: current.invitationId,
    invitationAcceptedAt: current.invitationAcceptedAt,
  };

  await withTimeout(
    supabase.auth.updateUser({ data: { journey: merged } }),
    10000,
    "saving your journey"
  );

  return merged;
}

export async function touchLastSeen(
  supabase: SupabaseAuthClient,
  current: JourneyContext
): Promise<JourneyContext> {
  const merged: JourneyContext = { ...current, lastSeenAt: new Date().toISOString() };
  await withTimeout(
    supabase.auth.updateUser({ data: { journey: merged } }),
    10000,
    "saving your visit"
  );
  return merged;
}

// Records that a signed-in visitor accepted a given invitation --
// called from the client-side invitation accept gate (see
// components/echo/invitations/InvitationAcceptGate.tsx) once
// resolveClientPrincipal confirms a session exists. Idempotent per
// token: re-visiting the same already-accepted invitation (e.g.
// refreshing the preview page) must never overwrite the original
// acceptedAt with a later one, so this is a real no-op, not just a
// harmless re-write, when `invitationId` already matches.
export async function recordInvitationAcceptance(
  supabase: SupabaseAuthClient,
  current: JourneyContext,
  invitationId: string
): Promise<JourneyContext> {
  if (shouldSkipInvitationAcceptance(current, invitationId)) return current;
  const merged: JourneyContext = {
    ...current,
    invitationId,
    invitationAcceptedAt: new Date().toISOString(),
    // Accepting an invitation is itself a real beginning -- same as
    // recordIntentionContext, never overwrites an already-set startedAt.
    startedAt: current.startedAt ?? new Date().toISOString(),
  };
  await withTimeout(
    supabase.auth.updateUser({ data: { journey: merged } }),
    10000,
    "saving your invitation"
  );
  return merged;
}

// RC5 -- called server-side from app/continue/page.tsx, only after a
// signed PrometheusK completion receipt has been verified
// (lib/onboarding/receipt.ts). `completedAt` is the receipt's own
// completed_at claim, not the current time, so the recorded fact
// reflects when PrometheusK actually observed completion. Idempotent
// by design: re-verifying the same still-valid receipt (e.g. a second
// /continue hit before it expires) just re-writes the same value.
export async function recordPracticeCompletion(
  supabase: SupabaseAuthClient,
  current: JourneyContext,
  completedAt: string
): Promise<JourneyContext> {
  const merged: JourneyContext = { ...current, practiceCompletedAt: completedAt };
  await withTimeout(
    supabase.auth.updateUser({ data: { journey: merged } }),
    10000,
    "saving your completed practice"
  );
  return merged;
}
