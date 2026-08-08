# Vendored StudioK artifact

`livingVrindavan.world.json` is an unmodified, byte-for-byte copy of
`studiok-specifications`' portable artifact, pinned to a tagged snapshot
per [STK-WO-004](https://github.com/studiok-world-factory/studiok-specifications)'s
"downstream repo references the tagged snapshot, not an unpinned branch"
requirement (that repo has no remote configured in this environment, so
the pin is recorded here rather than via a package registry).

- **Source repo:** `studiok-specifications`
- **Source path:** `living-vrindavan/living-vrindavan.world.json`
- **Source spec:** `STK-SPEC-002` (Living Vrindavan — Portable World
  Artifact), derived from `STK-SPEC-001` (Living World Definition schema)
- **Pinned tag:** `v0.1.0`
- **Pinned commit:** `d869895f733741fcb7373b386305750b0b2391b8`
- **Canon lineage:** `STK-CAN-001` through `STK-CAN-005`, `canon-manifest.json` `v0.1.0`

Do not hand-edit this JSON file. To pick up a new StudioK release, copy
the updated artifact from a newer tag and update the pin above in the
same commit — this is a manual, reviewed re-vendor, not a live
cross-repo import (per Sprint 5's "prefer a build/export artifact rather
than coupling repositories").

`../vrindavanDefinition.ts` converts this artifact's renderer-neutral
graph shape into `@avatark/living-world-runtime`'s own `WorldDefinition`
shape -- that conversion is Host logic, not part of the vendored artifact.
