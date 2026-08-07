import type { JourneyDefinition } from '@avatark/experience-runtime'

// Starter definition owned by this app -- illustrative content, not a real,
// shipped product experience (no Living Symphony / Reflection engine exists
// yet to back richer content; see docs/CONSUMER_PLATFORM_ARCHITECTURE.md §7).
// Any product (StreamK, CinemaK, GameK, ArenaK, PrometheusK, StudioK) that
// wants a real journey supplies its own JourneyDefinition and hands it to a
// JourneyRuntime the same way this file does -- nothing about the runtime
// itself is specific to this definition's content.
export const AVATARK_WELCOME_JOURNEY: JourneyDefinition = {
  id: 'avatark-welcome-journey',
  title: 'Welcome Journey',
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
