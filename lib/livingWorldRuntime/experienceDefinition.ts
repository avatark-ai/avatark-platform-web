// Sprint 6, Phase 3/7: the one and only place StudioK's renderer-neutral
// Experience Description artifact (STK-SPEC-004) meets
// @avatark/renderer-contracts' own ExperienceDescription shape -- Host
// logic (lib/), mirroring vrindavanDefinition.ts's own role for the
// world-definition artifact. Neither @avatark/renderer-contracts nor any
// runtime package imports this file or knows Living Vrindavan exists.
import type { ExperienceDescription } from "@avatark/renderer-contracts";
import { validateExperienceDescription } from "@avatark/renderer-contracts";
import experienceArtifact from "./vendor/livingVrindavan.experience.json" with { type: "json" };
import worldArtifact from "./vendor/livingVrindavan.world.json" with { type: "json" };
import { verifyArtifactIngestion } from "./artifactIngestion.ts";

const ingestion = verifyArtifactIngestion("living-vrindavan.experience", "1.0.0");
if (!ingestion.valid) {
  throw new Error(`vendored artifact "living-vrindavan.experience" failed ingestion verification: ${ingestion.errors.join("; ")}`);
}

const structuralErrors = validateExperienceDescription(experienceArtifact);
if (structuralErrors.length > 0) {
  throw new Error(
    `vendored experience artifact for "${(experienceArtifact as { world?: string }).world}" is structurally invalid: ` +
      structuralErrors.map((e) => e.message).join("; "),
  );
}

// Cross-artifact validation the JSON Schema itself can't express: this
// experience description must stay in lockstep with the companion
// world-definition artifact it describes -- same location ids, same
// reflection affordances, same connection graph. Same rule
// studiok-specifications' own validate-experience-artifact.mjs enforces
// at authoring time; re-checked here because a vendored copy can go
// stale independently of its companion.
function crossValidate(experience: ExperienceDescription, world: typeof worldArtifact): void {
  const worldName = world.world;
  if (experience.world !== worldName) {
    throw new Error(`experience artifact world "${experience.world}" does not match companion world artifact "${worldName}"`);
  }

  const worldLocationIds = new Set(world.locations.map((l) => l.id));
  const experienceLocationIds = new Set(experience.locations.map((l) => l.id));
  for (const id of experienceLocationIds) {
    if (!worldLocationIds.has(id)) throw new Error(`experience location "${id}" has no matching world-definition location`);
  }
  for (const id of worldLocationIds) {
    if (!experienceLocationIds.has(id)) throw new Error(`world-definition location "${id}" has no matching experience description`);
  }

  const reflectionCapableById = new Map(world.locations.map((l) => [l.id, Boolean(l.reflectionCapable)]));
  for (const loc of experience.locations) {
    const expected = reflectionCapableById.get(loc.id);
    if (expected !== undefined && loc.interaction.reflectionAvailable !== expected) {
      throw new Error(`location "${loc.id}": interaction.reflectionAvailable (${loc.interaction.reflectionAvailable}) does not match world-definition reflectionCapable (${expected})`);
    }
  }

  const worldConnections = new Set(world.connections.map((c) => `${c.from}->${c.to}`));
  const experienceTransitions = new Set(experience.transitions.map((t) => `${t.from}->${t.to}`));
  for (const key of experienceTransitions) {
    if (!worldConnections.has(key)) throw new Error(`experience transition "${key}" has no matching world-definition connection`);
  }
  for (const key of worldConnections) {
    if (!experienceTransitions.has(key)) throw new Error(`world-definition connection "${key}" has no matching experience transition`);
  }
}

const typedExperience = experienceArtifact as ExperienceDescription;
crossValidate(typedExperience, worldArtifact);

export const LIVING_VRINDAVAN_EXPERIENCE: ExperienceDescription = typedExperience;

export function getLocationExperience(locationId: string) {
  return LIVING_VRINDAVAN_EXPERIENCE.locations.find((loc) => loc.id === locationId);
}
