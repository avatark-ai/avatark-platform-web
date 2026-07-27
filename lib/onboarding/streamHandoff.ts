// ============================================================
// Echo -> StreamK story-handoff seam -- the same honesty pattern as
// lib/onboarding/practiceHandoff.ts's Echo -> PrometheusK contract, but
// for `story`/`episode` invitation destinations, which today are flat
// dead ends in lib/invitations/destination.ts (no registry at all).
//
// No story content is shipped yet (content/echo/stories/ is empty) and
// no StreamK content-id mapping has ever been verified -- the registry
// below is deliberately empty. `null` for a given slug -- whether via an
// explicit entry or the default fallback -- means "no verified StreamK
// match yet," never an omission, same convention as
// PRACTICE_HANDOFF_REGISTRY. Seed real entries only once both a real
// story exists in content and its StreamK content id has been confirmed.
export interface StreamHandoffTarget {
  streamkContentId: string;
}

const STREAM_HANDOFF_REGISTRY: Record<string, StreamHandoffTarget | null> = {};

export function resolveStreamHandoffTarget(storySlug: string): StreamHandoffTarget | null {
  return STREAM_HANDOFF_REGISTRY[storySlug] ?? null;
}

export function isStreamHandoffAvailable(storySlug: string): boolean {
  return resolveStreamHandoffTarget(storySlug) !== null;
}
