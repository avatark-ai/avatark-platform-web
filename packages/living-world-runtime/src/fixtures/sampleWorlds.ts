import type { WorldDefinition } from "../types.ts";

// The five currently known Living Worlds, by name only. This package
// does not know or encode anything about what happens inside any of
// them -- the fixture below gives each the same generic three-location
// shape purely so tests and host prototypes have something to run the
// runtime against.
export const KNOWN_WORLD_NAMES = [
  "Living Forest",
  "Living Vrindavan",
  "Living Stillness",
  "Living Symphony",
  "Living Forge",
] as const;

export type KnownWorldName = (typeof KNOWN_WORLD_NAMES)[number];

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function createSampleWorldDefinition(name: KnownWorldName): WorldDefinition {
  const id = slugify(name);
  return {
    id,
    name,
    description: `${name} (sample fixture world)`,
    entryLocationId: `${id}-entry`,
    locations: [
      { id: `${id}-entry`, name: "Entry", order: 0 },
      { id: `${id}-second`, name: "Second Location", order: 1, requiresLocationIds: [`${id}-entry`] },
      { id: `${id}-third`, name: "Third Location", order: 2, requiresLocationIds: [`${id}-second`] },
    ],
    activities: [
      { id: `${id}-activity-entry`, locationId: `${id}-entry`, name: "Orientation" },
      { id: `${id}-activity-second`, locationId: `${id}-second`, name: "Deepen" },
      { id: `${id}-activity-third`, locationId: `${id}-third`, name: "Integrate" },
    ],
  };
}

export const SAMPLE_WORLD_DEFINITIONS: WorldDefinition[] = KNOWN_WORLD_NAMES.map(createSampleWorldDefinition);
