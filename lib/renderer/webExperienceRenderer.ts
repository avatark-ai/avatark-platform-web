// Sprint 6, Phase 4: the first reference RendererAdapter for
// @avatark/renderer-contracts' ExperienceDescription -- everything
// renderer-specific (color, gradients, pacing-to-milliseconds, copy)
// lives here and only here. Neither @avatark/renderer-contracts nor any
// Runtime Kernel package knows this file exists. A future Unreal renderer
// would be a sibling module implementing the same RendererAdapter
// interface with a completely different TOutput -- nothing here would
// need to change for that to be true.
import type {
  LocationExperience,
  PresentationContext,
  PresentationPlan,
  RendererAdapter,
  RendererCapabilities,
  TransitionAffordance,
} from "@avatark/renderer-contracts";
import { resolvePresentationPlan } from "@avatark/renderer-contracts";

export interface WebLocationPresentation {
  locationId: string;
  biomeLabel: string;
  atmosphereLabel: string;
  /** A single, restrained accent color (an oklch/hsl string) derived from
   * the location's biome -- never more than one hue in play at a time.
   * Falls back to the neutral gold accent for any biome this renderer
   * doesn't recognize yet, rather than erroring: an unrecognized
   * capability/vocabulary value degrades gracefully, same rule
   * resolvePresentationPlan already applies to capability negotiation. */
  accentColor: string;
  ambientMotionEnabled: boolean;
  /** A quiet, textual soundscape affordance -- e.g. "Flowing water" --
   * shown only once a viewer explicitly enables ambient sound. This
   * renderer has no audio asset pipeline yet (Sprint 6 doesn't build
   * one), so it surfaces the authored motif as a caption rather than
   * fabricating audio playback that doesn't exist -- same "shallow but
   * real" honesty Sprint 5 applied to the reflection affordance. */
  soundscapeCaption: string | null;
  transitionDurationMs: number;
}

const DEFAULT_ACCENT = "oklch(75% 0.12 85)"; // muted gold, matches --gold's own register

const BIOME_ACCENTS: Record<string, string> = {
  threshold: "oklch(80% 0.05 85)", // near-neutral warm white -- arrival, not yet anywhere in particular
  riverbank: "oklch(70% 0.09 220)", // muted teal-blue
  grove: "oklch(65% 0.10 150)", // muted moss green
  path: "oklch(68% 0.11 55)", // muted amber-earth
};

const PACING_TO_MS: Record<LocationExperience["presentation"]["pacing"], number> = {
  slow: 900,
  moderate: 500,
};

function labelize(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function capabilities(): RendererCapabilities {
  return { supportsAmbientMotion: true, supportsSound: true, supportsReducedMotion: true };
}

export function present(plan: PresentationPlan): WebLocationPresentation {
  return {
    locationId: plan.locationId,
    biomeLabel: labelize(plan.environment.biome),
    atmosphereLabel: labelize(plan.atmosphere.quality),
    accentColor: BIOME_ACCENTS[plan.environment.biome] ?? DEFAULT_ACCENT,
    ambientMotionEnabled: plan.ambientMotionEnabled,
    soundscapeCaption: plan.soundscape ? plan.soundscape.motifs.map(labelize).join(", ") : null,
    transitionDurationMs: PACING_TO_MS[plan.presentation.pacing],
  };
}

export const webExperienceRenderer: RendererAdapter<WebLocationPresentation> = { capabilities, present };

/** Convenience entry point for a Host call site that has a
 * LocationExperience and a viewer's own preferences, but doesn't need to
 * touch resolvePresentationPlan/capabilities directly. */
export function renderLocationForWeb(location: LocationExperience, context: PresentationContext): WebLocationPresentation {
  return present(resolvePresentationPlan(location, capabilities(), context));
}

const TRANSITION_LABELS: Record<TransitionAffordance, string> = {
  "threshold-crossing": "Cross the threshold",
  "gradual-emergence": "Continue onward",
  "branching-choice": "Choose your path",
};

export function transitionLabel(affordance: TransitionAffordance | null): string {
  return affordance ? TRANSITION_LABELS[affordance] : "Next";
}
