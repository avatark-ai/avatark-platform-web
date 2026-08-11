# Unreal fixture payloads -- provenance and intended use

Two files here are hand-authored, schema-conformant `WorldExperienceSnapshot`
payloads (the exact type at `packages/world-experience-contracts/src/worldExperienceSnapshot.ts`):

- `living-vrindavan.snapshot.example.json`
- `living-forest-f01.snapshot.example.json`

They exist so a future Unreal 5.8 bridge can start decoding real payload
shapes today, without a running Runtime endpoint. See
`docs/STUDIOK_UNREAL_58_INTEGRATION_CONTRACT_PACK.md` Sections 3-4 and 23
for how they're meant to be used (fixture/offline mode) and Section 26 for
how they're verified.

## What is real vs. hand-composed

**Real, verbatim from the repository:**
- Every semantic ID (`living-vrindavan`, `yamuna`, `vrindavan-entry`,
  `kadamba-grove`, `govardhan-path`, `patch-*`, `place-*`,
  `route-govardhan-path`, `avatark-population-cow-1/2`,
  `avatark-population-bird-flock-1`, `avatark-population-cow-herd`,
  `avatark-population-bird-flock`, `yamuna-flowering-reflection`,
  `yamuna-narrative-gate`, `kadamba-grove-ambient-presence`,
  `canonical-event-govardhan-lifting`; `living-forest-fixture`,
  `forest-clearing`, `forest-stream`, `forest-pond`, `patch-forest-p01/02/03`,
  `deer-1`, `deer-2`, `deer-herd-1`, `forest-clearing-ambient-presence`)
  come directly from `lib/livingPopulation/vrindavanPopulationDefinition.ts`,
  `lib/livingForest/definition.ts` and `lib/livingForest/hostService.ts`, or
  from the Build 01/04/06 final reports that cite them.
- Every closed-vocabulary value (`ExperienceStage`, `ArrivalReason`,
  `EnvironmentalBand`, `DayPhase`, `OccupancyLevel`, `BehaviorType`,
  `ReturnRecognitionFactType`, `WorldEventCategory`, `TransitionAffordance`,
  `EncounterCategory`, `TerritoryClaimStrength`, `GroupRoutineIntentType`)
  is a real value from that type's own union in `packages/*-contracts/src/`.
- The season pair (`vasanta`/`grishma` for Vrindavan, `canopy-wet`/`drought`
  for the Forest fixture, the latter under the deliberately-fictional
  `STK-CAN-999`) and the leave/return scenario for the Forest fixture
  (season transitions while away; `deer-1` returns to `forest-pond` via
  seeded memory while `deer-2` takes the raw deterministic default of
  `forest-stream`) are taken directly from
  `lib/livingForest/livingForestVerticalSlice.test.ts`'s own asserted
  proof, not invented for this pack.
- `translateToUnrealCommands` (`packages/world-embodiment-runtime/src/unrealCommandTranslator.ts`)
  is the real, unmodified function; `lib/livingWorldExperience/unrealFixtureValidation.test.ts`
  runs it against both fixtures' `embodiment` field and asserts on its
  real output.

**Hand-composed for this pack (clearly not a live capture):**
- `generatedAt`/`occurredAt` timestamps, `tick` numbers, `worldEvent`/
  `historicalMarker` ids, and the `spatialNode.transform`/`bounds` values.
  Per Section 10 of the contract pack, Runtime's own `SpatialNode` carries
  an abstract/normalized layout, not authoritative Unreal world-space --
  these numbers are illustrative of that abstraction, not a captured
  value from any real run, and are NOT the same numbers the Unreal
  adapter's own `VrindavanPatchLayout` constant table would use.
  `spatialNode.bounds.radius` units are meters, matching the abstract
  scale Build 02/05/06 describe; the Unreal-side adapter converts to
  centimeters at its own mapping boundary (Section 10), never before.
- `WorldEmbodimentProvenance.worldArtifactSpecId`/`experienceArtifactSpecId`/
  `systemsArtifactSpecId` are a best-effort assembly of the real cited
  Canon/Spec ids (`STK-CAN-001`, `STK-CAN-006`, `STK-SPEC-006` for
  Vrindavan; `STK-CAN-999` for the Forest fixture) into the 3 separate
  provenance fields the type requires -- the exact per-field assignment
  has not been verified against a live `WorldEmbodimentProvenance`
  construction call, since no live Forest composer exists yet (see the
  contract pack's Section 4 gap note).
- There is no live `composeLivingForestWorldExperienceSnapshot` function
  in this repository as of this pack. The Forest fixture proves the
  `WorldExperienceSnapshot` TYPE and the `translateToUnrealCommands`
  RUNTIME FUNCTION are both world-agnostic and already accept Forest
  content unmodified; it does not prove a Forest HTTP route exists,
  because one does not yet.

## How to re-verify

```
npm run typecheck   # fails if either fixture's shape drifts from the real WorldExperienceSnapshot
npm test            # includes lib/livingWorldExperience/unrealFixtureValidation.test.ts
```

No zod/ajv/JSON-schema validator exists anywhere in this repository for
these types (confirmed by direct inspection) -- `tsc --noEmit` plus the
targeted runtime assertions above are the whole of what "validated" means
for this pack, honestly stated rather than implying a schema layer that
does not exist.
