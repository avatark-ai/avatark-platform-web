// Converts the vendored StudioK portable artifact (see vendor/README.md)
// into @avatark/living-world-runtime's own WorldDefinition shape -- the
// one and only place StudioK's renderer-neutral graph format meets the
// Runtime Kernel's own vocabulary. This file is Host logic (lib/), never
// imported by packages/living-world-runtime itself, which stays a true
// leaf with zero knowledge of StudioK or Krishna.
//
// The artifact's `connections[]` are directed edges (StudioK's authored
// graph); the runtime's own WorldLocation.requiresLocationIds models
// prerequisites for *unlocking* a location. For this vertical slice's
// tree-shaped graph (every non-entry location has exactly one incoming
// edge), "requires its one parent" is the correct, faithful translation --
// a future world with a denser graph (multiple prerequisites per
// location) would need a richer conversion here, not a Runtime Kernel
// change.
import type { WorldActivity, WorldDefinition, WorldLocation } from "@avatark/living-world-runtime";
import artifact from "./vendor/livingVrindavan.world.json" with { type: "json" };
import { verifyArtifactIngestion } from "./artifactIngestion.ts";

// Sprint 6, Phase 7: re-verify the vendored file's checksum against
// vendor/manifest.json before trusting it, on top of the structural
// re-validation below. A byte-identical import doesn't prove the file on
// disk is still the one that was actually ingested and reviewed -- the
// manifest does.
const ingestion = verifyArtifactIngestion("living-vrindavan.world", "1.0.0");
if (!ingestion.valid) {
  throw new Error(`vendored artifact "living-vrindavan.world" failed ingestion verification: ${ingestion.errors.join("; ")}`);
}

interface ArtifactLocation {
  id: string;
  name: string;
  role: string;
  purpose?: string;
  experientialQuality?: string;
  humanQuestion?: string | null;
  reflectionCapable?: boolean;
}

interface ArtifactConnection {
  from: string;
  to: string;
}

interface WorldArtifact {
  schemaVersion: string;
  world: string;
  identity: { name: string; franchise: string; worldClass: string; primaryTheme: string; purpose?: string };
  locations: ArtifactLocation[];
  entryLocationId: string;
  connections: ArtifactConnection[];
  principles?: { canonId: string; title: string }[];
  provenance: { canonDocIds: string[]; canonVersion: string; specId: string; specVersion: number; generatedAt: string };
}

const doc = artifact as WorldArtifact;

// Defensive re-validation -- the artifact was already schema-validated in
// studiok-specifications (STK-SPEC-002), but a vendored file can go stale
// or be hand-edited by mistake. Fail loudly at module load, not silently
// at runtime, if the copy is malformed.
function validate(doc: WorldArtifact): void {
  const ids = new Set(doc.locations.map((l) => l.id));
  if (ids.size !== doc.locations.length) throw new Error(`vendored artifact for "${doc.world}" has duplicate location ids`);
  if (!ids.has(doc.entryLocationId)) {
    throw new Error(`vendored artifact for "${doc.world}": entryLocationId "${doc.entryLocationId}" does not resolve`);
  }
  for (const conn of doc.connections) {
    if (!ids.has(conn.from)) throw new Error(`vendored artifact for "${doc.world}": connection references unknown location "${conn.from}"`);
    if (!ids.has(conn.to)) throw new Error(`vendored artifact for "${doc.world}": connection references unknown location "${conn.to}"`);
  }
}

validate(doc);

function computeOrderAndPrerequisites(doc: WorldArtifact): Map<string, { order: number; requiresLocationIds: string[] }> {
  const parentOf = new Map<string, string>();
  for (const conn of doc.connections) parentOf.set(conn.to, conn.from);

  const order = new Map<string, number>();
  order.set(doc.entryLocationId, 0);
  // Breadth-first over the (small, tree-shaped) graph -- deterministic
  // ordering by distance from the entry location.
  let frontier = [doc.entryLocationId];
  let depth = 0;
  const childrenOf = new Map<string, string[]>();
  for (const conn of doc.connections) {
    childrenOf.set(conn.from, [...(childrenOf.get(conn.from) ?? []), conn.to]);
  }
  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      for (const child of childrenOf.get(id) ?? []) {
        if (!order.has(child)) {
          order.set(child, depth);
          next.push(child);
        }
      }
    }
    frontier = next;
  }

  const result = new Map<string, { order: number; requiresLocationIds: string[] }>();
  for (const loc of doc.locations) {
    const parent = parentOf.get(loc.id);
    result.set(loc.id, {
      order: order.get(loc.id) ?? doc.locations.length, // unreachable locations sort last; none expected
      requiresLocationIds: parent ? [parent] : [],
    });
  }
  return result;
}

function buildLocations(doc: WorldArtifact): WorldLocation[] {
  const derived = computeOrderAndPrerequisites(doc);
  return doc.locations.map((loc) => {
    const { order, requiresLocationIds } = derived.get(loc.id)!;
    const location: WorldLocation = { id: loc.id, name: loc.name, order };
    if (loc.purpose) location.description = loc.purpose;
    if (requiresLocationIds.length > 0) location.requiresLocationIds = requiresLocationIds;
    return location;
  });
}

function buildActivities(doc: WorldArtifact): WorldActivity[] {
  // Only locations StudioK actually authored a reflection affordance for
  // get one -- never fabricated for the others. The prompt's own text
  // rides in `description` (a free-text field the runtime already
  // supports); `reflectionRef` stays the opaque pointer the runtime
  // expects, carrying provenance back to Canon.
  return doc.locations
    .filter((loc) => loc.reflectionCapable && loc.humanQuestion)
    .map((loc) => ({
      id: `${loc.id}-reflection`,
      locationId: loc.id,
      name: "Reflection",
      description: loc.humanQuestion!,
      reflectionRef: { reflectionId: `${doc.world}#${loc.id}`, source: "studiok-canon" },
    }));
}

export const LIVING_VRINDAVAN_DEFINITION: WorldDefinition = {
  id: doc.world,
  name: doc.identity.name,
  description: doc.identity.purpose,
  entryLocationId: doc.entryLocationId,
  locations: buildLocations(doc),
  activities: buildActivities(doc),
};

export const LIVING_VRINDAVAN_PROVENANCE = doc.provenance;
