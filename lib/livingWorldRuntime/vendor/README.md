# Vendored StudioK artifacts

All files in this directory are unmodified, byte-for-byte copies of
`studiok-specifications`' portable artifacts. `manifest.json` (Sprint 6,
Phase 7) is the ingestion record: it names each artifact's identity,
spec/schema version, Canon provenance, pinned source commit, and a sha256
checksum of the exact bytes ingested. `../artifactIngestion.ts` re-checks
that checksum against the file actually on disk every time
`vrindavanDefinition.ts` or `experienceDefinition.ts` loads — a stale or
hand-edited vendored file fails loudly at module load, not silently at
runtime. This is the smallest robust ingestion mechanism appropriate to
the current architecture, not a package-registry service; see
`manifest.json`'s own upgrade-path note in `artifactIngestion.ts`'s
header comment for what changes once these repos have real remotes.

## `livingVrindavan.world.json`

- **Source repo:** `studiok-specifications`
- **Source path:** `living-vrindavan/living-vrindavan.world.json`
- **Source spec:** `STK-SPEC-002` (Living Vrindavan — Portable World
  Artifact, `Approved`), derived from `STK-SPEC-001` (Living World
  Definition schema, `Approved`)
- **Pinned tag:** `v0.1.0`
- **Pinned commit:** `d869895f733741fcb7373b386305750b0b2391b8`
- **Canon lineage:** `STK-CAN-001` through `STK-CAN-005`, `canon-manifest.json` `v0.1.0`

`../vrindavanDefinition.ts` converts this artifact's renderer-neutral
graph shape into `@avatark/living-world-runtime`'s own `WorldDefinition`
shape -- that conversion is Host logic, not part of the vendored artifact.

## `livingVrindavan.experience.json`

- **Source repo:** `studiok-specifications`
- **Source path:** `living-vrindavan/living-vrindavan.experience.json`
- **Source spec:** `STK-SPEC-004` (Living Vrindavan — Experience
  Artifact, `Approved` 2026-08-08 by explicit Founder/Architecture
  sign-off, `spec-manifest.json` `v0.2.0`), derived from `STK-SPEC-003`
  (Living World Experience Description schema, also `Approved`,
  `v0.2.0`)
- **Pinned tag:** `v0.2.0`
- **Pinned commit:** `ef9c65bd34d135fe66c625b0c2e18946f5464067` --
  re-pinned from the pre-approval commit (`5ac7b395...`) to the approval
  commit once STK-SPEC-003/004 reached `Approved`, matching
  `livingVrindavan.world.json`'s own precedent above (STK-SPEC-002 was
  likewise re-pinned to its approval-batch commit even though the
  artifact's own bytes didn't change at approval time). Checksum below is
  unchanged either way -- confirmed byte-identical to the Proposed
  revision; only the governance status changed, never the content.
- **Canon lineage:** `STK-CAN-001`, `STK-CAN-002`, `STK-CAN-004`, `STK-CAN-005`, `canon-manifest.json` `v0.1.0`

`../experienceDefinition.ts` converts this artifact into
`@avatark/renderer-contracts`' own `ExperienceDescription` shape, and
cross-validates it against `livingVrindavan.world.json` (same location
ids, same reflection affordances, same connection graph) -- both files in
this directory must always describe the same world.

## `livingVrindavan.systems.json`

- **Source repo:** `studiok-specifications`
- **Source path:** `living-vrindavan/living-vrindavan.systems.json`
- **Source spec:** `STK-SPEC-006` (Living Vrindavan — Systems Artifact,
  `Approved` 2026-08-08 by explicit Founder/Architecture sign-off
  following Sprint 7 review, `spec-manifest.json` `v0.3.0`), derived from
  `STK-SPEC-005` (Living World Systems Definition schema, also
  `Approved`, `v0.3.0`) and `STK-CAN-006` (Seasonal Identity, also
  `Approved`, `canon-manifest.json` `v0.2.0`)
- **Pinned tag:** `v0.3.0`
- **Pinned commit:** `0712b5d05ad46044f66ff6dd9300c135f5a773c7` --
  re-pinned from the pre-approval commit (`5028ce9f...`) to the approval
  commit once STK-SPEC-005/006 reached `Approved`, matching the other two
  artifacts' own precedent above. Checksum below is unchanged -- confirmed
  byte-identical to the Proposed revision; only the governance status
  changed, never the content.
- **Canon lineage:** `STK-CAN-006` only — this artifact adds no location
  identity of its own, only seasons/entity-archetypes/encounter-rules

`../../livingSystems/systemsDefinition.ts` converts this artifact into
`@avatark/living-systems-contracts`' own `SeasonDefinition[]`/
`EntityArchetype[]`/`EncounterRule[]` shapes, and cross-validates
`entityArchetypes[].locationId`/`encounterRules[].locationId` against
`livingVrindavan.world.json` — all three vendored files in this directory
must always describe the same world.

Do not hand-edit any JSON file. To pick up a new StudioK release, copy
the updated artifact from a newer tag/commit, update `manifest.json`'s
`pinnedTag`/`pinnedCommit`/`checksum` for that artifact in the same
commit, and update the corresponding section above — this is a manual,
reviewed re-vendor, not a live cross-repo import (per Sprint 5's "prefer a
build/export artifact rather than coupling repositories").
