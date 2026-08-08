// Sprint 7, Phase 1/7/20: the one and only place StudioK's renderer-
// neutral Systems Artifact (STK-SPEC-006) meets @avatark/living-systems-
// contracts' own SeasonDefinition/EntityArchetype/EncounterRule shapes --
// Host logic (lib/), mirroring vrindavanDefinition.ts's and
// experienceDefinition.ts's own role for their artifacts. Neither
// @avatark/living-systems-contracts nor @avatark/living-systems-runtime
// imports this file or knows Living Vrindavan, Vasanta, or Grīṣma exist.
import type { EncounterCategory, EncounterConditionBand, EncounterRule, EntityArchetype, EnvironmentalBand, SeasonDefinition } from "@avatark/living-systems-contracts"
import systemsArtifact from "../livingWorldRuntime/vendor/livingVrindavan.systems.json" with { type: "json" };
import worldArtifact from "../livingWorldRuntime/vendor/livingVrindavan.world.json" with { type: "json" };
import { verifyArtifactIngestion } from "../livingWorldRuntime/artifactIngestion.ts";

const ingestion = verifyArtifactIngestion("living-vrindavan.systems", "1.0.0");
if (!ingestion.valid) {
  throw new Error(`vendored artifact "living-vrindavan.systems" failed ingestion verification: ${ingestion.errors.join("; ")}`);
}

interface ArtifactSeason {
  id: string;
  name: string;
  order: number;
  canonId: string;
  environmentalEnvelope: Record<string, EnvironmentalBand>;
  minDurationTicks: number;
  allowedNextSeasonIds: string[];
}
interface ArtifactEntityArchetype {
  id: string;
  name: string;
  locationId: string;
  lifecyclePhases: string[];
  initialLifecyclePhase: string;
}
interface ArtifactEncounterRule {
  id: string;
  locationId: string;
  category: EncounterCategory;
  condition: { band: EncounterConditionBand; atLeast: EnvironmentalBand };
}
interface SystemsArtifact {
  schemaVersion: string;
  world: string;
  seasons: ArtifactSeason[];
  entityArchetypes: ArtifactEntityArchetype[];
  encounterRules: ArtifactEncounterRule[];
  provenance: { canonDocIds: string[]; canonVersion: string; specId: string; specVersion: number; worldArtifactSpecId: string; generatedAt: string };
}

const doc = systemsArtifact as SystemsArtifact;

// Defensive re-validation, same rule vrindavanDefinition.ts/
// experienceDefinition.ts already apply: fail loudly at module load if
// the vendored copy is malformed, never silently at runtime.
function validate(doc: SystemsArtifact, world: typeof worldArtifact): void {
  if (doc.world !== world.world) throw new Error(`systems artifact world "${doc.world}" does not match companion world artifact "${world.world}"`);

  const seasonIds = new Set(doc.seasons.map((s) => s.id));
  for (const season of doc.seasons) {
    for (const nextId of season.allowedNextSeasonIds) {
      if (!seasonIds.has(nextId)) throw new Error(`season "${season.id}": allowedNextSeasonIds references unknown season "${nextId}"`);
    }
  }

  const worldLocationIds = new Set(world.locations.map((l) => l.id));
  for (const archetype of doc.entityArchetypes) {
    if (!worldLocationIds.has(archetype.locationId)) {
      throw new Error(`entity archetype "${archetype.id}": locationId "${archetype.locationId}" does not exist in the companion world-definition artifact`);
    }
    if (!archetype.lifecyclePhases.includes(archetype.initialLifecyclePhase)) {
      throw new Error(`entity archetype "${archetype.id}": initialLifecyclePhase "${archetype.initialLifecyclePhase}" is not in its own lifecyclePhases`);
    }
  }
  for (const rule of doc.encounterRules) {
    if (!worldLocationIds.has(rule.locationId)) {
      throw new Error(`encounter rule "${rule.id}": locationId "${rule.locationId}" does not exist in the companion world-definition artifact`);
    }
  }
}

validate(doc, worldArtifact);

export const LIVING_VRINDAVAN_SEASONS: SeasonDefinition[] = doc.seasons.map((s) => ({
  id: s.id,
  name: s.name,
  order: s.order,
  canonId: s.canonId,
  environmentalEnvelope: {
    temperatureBand: s.environmentalEnvelope.temperatureBand,
    precipitationBand: s.environmentalEnvelope.precipitationBand,
    humidityBand: s.environmentalEnvelope.humidityBand,
    hydrologyBaselineBand: s.environmentalEnvelope.hydrologyBaselineBand,
    vegetationActivityBand: s.environmentalEnvelope.vegetationActivityBand,
    animalActivityBand: s.environmentalEnvelope.animalActivityBand,
  },
  minDurationTicks: s.minDurationTicks,
  allowedNextSeasonIds: s.allowedNextSeasonIds,
}));

export const LIVING_VRINDAVAN_ENTITY_ARCHETYPES: EntityArchetype[] = doc.entityArchetypes.map((a) => ({
  id: a.id,
  name: a.name,
  locationId: a.locationId,
  lifecyclePhases: a.lifecyclePhases,
  initialLifecyclePhase: a.initialLifecyclePhase,
}));

export const LIVING_VRINDAVAN_ENCOUNTER_RULES: EncounterRule[] = doc.encounterRules.map((r) => ({
  id: r.id,
  locationId: r.locationId,
  category: r.category,
  condition: r.condition,
}));

export const LIVING_VRINDAVAN_SYSTEMS_PROVENANCE = doc.provenance;
