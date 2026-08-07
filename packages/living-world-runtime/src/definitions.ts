import { UnknownLocationError, UnknownWorldError } from "./errors.ts";
import type { LocationId, WorldDefinition, WorldId, WorldLocation } from "./types.ts";

export function findDefinition(definitions: WorldDefinition[], worldId: WorldId): WorldDefinition {
  const definition = definitions.find((d) => d.id === worldId);
  if (!definition) throw new UnknownWorldError(worldId);
  return definition;
}

export function findLocation(definition: WorldDefinition, locationId: LocationId): WorldLocation {
  const location = definition.locations.find((l) => l.id === locationId);
  if (!location) throw new UnknownLocationError(definition.id, locationId);
  return location;
}
