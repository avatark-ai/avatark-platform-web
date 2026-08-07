import type { JourneyDefinition } from '@avatark/experience-runtime'

// Starter definition owned by this app -- illustrative content, not a real,
// shipped product experience (no Living Symphony / Reflection engine exists
// yet to back richer content; see docs/CONSUMER_PLATFORM_ARCHITECTURE.md §7).
// Any product (StreamK, CinemaK, GameK, ArenaK, PrometheusK, StudioK) that
// wants a real journey supplies its own JourneyDefinition and hands it to a
// JourneyRuntime the same way this file does -- nothing about the runtime
// itself is specific to this definition's content.
//
// "Journey" here is @avatark/experience-runtime's progression-engine sense
// (Episodes/Worlds/Practices/Milestones) -- NOT @avatark/journey's unrelated
// invitation-handoff sense, and not @avatark/context-runtime's
// currentNarrativeId-backed "journey" context field. See
// docs/RUNTIME_GLOSSARY.md Part 2 for the full disambiguation. User-facing
// copy avoids the word "Journey" for this reason (see app/account/page.tsx's
// JourneyView); this internal identifier is unchanged to avoid an
// unnecessary rename of working code.
export const AVATARK_WELCOME_JOURNEY: JourneyDefinition = {
  id: 'avatark-welcome-journey',
  title: 'Welcome Experience',
  episodes: [
    { id: 'orientation', title: 'Orientation', prerequisites: [], reflectionIds: ['orientation-reflection'] },
    { id: 'first-steps', title: 'First Steps', prerequisites: ['orientation'] },
  ],
  livingWorlds: [{ id: 'the-atrium', title: 'The Atrium', prerequisites: ['orientation'] }],
  practices: [
    { id: 'daily-checkin', kind: 'practice', title: 'Daily Check-In', prerequisites: [] },
    { id: 'first-challenge', kind: 'challenge', title: 'First Challenge', prerequisites: ['the-atrium'] },
  ],
  reflections: [
    { id: 'orientation-reflection', episodeId: 'orientation', prompt: 'What brought you here?' },
  ],
  milestones: [{ id: 'welcomed', title: 'Welcomed', criteria: { requiredEpisodeIds: ['orientation'] } }],
  completionCriteria: {
    requiredEpisodeIds: ['orientation', 'first-steps'],
    requiredWorldIds: ['the-atrium'],
  },
}
