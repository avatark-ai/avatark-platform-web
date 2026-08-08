import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePresentationPlan } from "@avatark/renderer-contracts";
import type { LocationExperience } from "@avatark/renderer-contracts";
import { capabilities, present, renderLocationForWeb, transitionLabel, webExperienceRenderer } from "./webExperienceRenderer.ts";

const yamuna: LocationExperience = {
  id: "yamuna",
  environment: { biome: "riverbank" },
  atmosphere: { quality: "contemplative" },
  time: { preferredState: "unspecified" },
  soundscape: { motifs: ["flowing-water"] },
  interaction: { reflectionAvailable: true },
  presentation: { intensity: "restrained", pacing: "slow" },
};

test("capabilities() declares ambient motion, sound, and reduced-motion support", () => {
  const caps = capabilities();
  assert.equal(caps.supportsAmbientMotion, true);
  assert.equal(caps.supportsSound, true);
  assert.equal(caps.supportsReducedMotion, true);
});

test("present() labelizes biome and atmosphere, hyphens become spaces and title case", () => {
  const plan = resolvePresentationPlan(yamuna, capabilities(), { reducedMotionPreferred: false, soundEnabled: true });
  const output = present(plan);
  assert.equal(output.biomeLabel, "Riverbank");
  assert.equal(output.atmosphereLabel, "Contemplative");
});

test("present() maps a known biome to a distinct accent color", () => {
  const plan = resolvePresentationPlan(yamuna, capabilities(), { reducedMotionPreferred: false, soundEnabled: true });
  const output = present(plan);
  assert.match(output.accentColor, /^oklch\(/);
});

test("present() falls back to the default accent for an unrecognized biome, never throws", () => {
  const exotic: LocationExperience = { ...yamuna, environment: { biome: "asteroid-field" } };
  const plan = resolvePresentationPlan(exotic, capabilities(), { reducedMotionPreferred: false, soundEnabled: true });
  assert.doesNotThrow(() => present(plan));
  const output = present(plan);
  assert.equal(output.accentColor, "oklch(75% 0.12 85)");
});

test("present() surfaces the soundscape as a textual caption only when the plan allows sound", () => {
  const allowed = present(resolvePresentationPlan(yamuna, capabilities(), { reducedMotionPreferred: false, soundEnabled: true }));
  assert.equal(allowed.soundscapeCaption, "Flowing Water");

  const disallowed = present(resolvePresentationPlan(yamuna, capabilities(), { reducedMotionPreferred: false, soundEnabled: false }));
  assert.equal(disallowed.soundscapeCaption, null);
});

test("present() derives transition duration from presentation.pacing", () => {
  const slow = present(resolvePresentationPlan(yamuna, capabilities(), { reducedMotionPreferred: false, soundEnabled: true }));
  assert.equal(slow.transitionDurationMs, 900);

  const moderateLocation: LocationExperience = { ...yamuna, presentation: { intensity: "standard", pacing: "moderate" } };
  const moderate = present(resolvePresentationPlan(moderateLocation, capabilities(), { reducedMotionPreferred: false, soundEnabled: true }));
  assert.equal(moderate.transitionDurationMs, 500);
});

test("renderLocationForWeb composes negotiation + presentation in one call, matching the two-step path", () => {
  const context = { reducedMotionPreferred: false, soundEnabled: true };
  const composed = renderLocationForWeb(yamuna, context);
  const twoStep = present(resolvePresentationPlan(yamuna, capabilities(), context));
  assert.deepEqual(composed, twoStep);
});

test("webExperienceRenderer satisfies RendererAdapter<WebLocationPresentation> end to end", () => {
  const plan = resolvePresentationPlan(yamuna, webExperienceRenderer.capabilities(), { reducedMotionPreferred: false, soundEnabled: true });
  const output = webExperienceRenderer.present(plan);
  assert.equal(output.locationId, "yamuna");
});

test("transitionLabel maps each authored affordance to a distinct label, and null to a generic fallback", () => {
  assert.equal(transitionLabel("threshold-crossing"), "Cross the threshold");
  assert.equal(transitionLabel("gradual-emergence"), "Continue onward");
  assert.equal(transitionLabel("branching-choice"), "Choose your path");
  assert.equal(transitionLabel(null), "Next");
});
