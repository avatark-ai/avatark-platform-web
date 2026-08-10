---
build: living-vrindavan-build-03
phase: 0
title: Living Content & Population Authoring Architecture
status: PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION
base: feature/sprint20-implementation @ 8e4ea70 (Runtime v1 facade, real, independently-verified)
runs_parallel_to:
  - Living Vrindavan Build 01 (feature/living-vrindavan-build-01 @ d313eb3, Part 1 CLOSED, Part 2 IN PROGRESS) — READ-ONLY, not modified
  - Living Vrindavan Build 02 Phase 0 (Visual Embodiment & Unreal Integration) — not yet available to read
---

# Living Vrindavan Build 03 Phase 0 — Living Content & Population Authoring Architecture

Architecture/specification preparation only. No production code, no migration, no renderer
asset, no new Canon. Every recommendation below is **PROPOSED — SUBJECT TO IMPLEMENTATION
RECONCILIATION**, and every item that depends on unfinished work elsewhere is explicitly marked
**PROVISIONAL — RECONCILE AFTER BUILD 01 CLOSURE**.

## 0. The Question This Answers

> What actually inhabits Living Vrindavan, and how does StudioK author that living content so
> Build 01 (world runtime) and Build 02 (visual/Unreal embodiment) can consume it safely, without
> either of them being asked to invent it themselves?

---

## Ground Truth Read (do not re-derive)

This document is built entirely from real, already-Approved or already-implemented artifacts —
nothing below reconstructs Living Vrindavan content from memory or from the mission brief's own
illustrative examples.

**Canon (`studiok-canon`, all `Approved`, `canonVersion 0.1.0`):**

- `STK-CAN-001` — World identity + the complete initial location set: `vrindavan-entry`,
  `yamuna`, `kadamba-grove`, `govardhan-path`. Graph: `vrindavan-entry → yamuna`,
  `yamuna → kadamba-grove`, `yamuna → govardhan-path` (a tree, Yamuna is the hub). Explicit:
  *"Do not add additional canonical locations without a separate Architecture/Founder
  authorization."*
- `STK-CAN-002` — Experience principles: experiential, reflective, alive, persistent, spatial,
  non-gamified, respectful-without-claiming-sacredness. Participant cycle:
  `ARRIVE → NOTICE → MOVE → ENCOUNTER → REFLECT → LEAVE → RETURN`.
- `STK-CAN-003` — The four location-keyed human questions (verbatim, not to be reworded).
- `STK-CAN-004` — Privacy principle (general Living Law): operational state (location,
  progression, timestamps) may persist; private belief/spirituality/emotional/religious/
  psychological state may **never** be inferred from navigation or reflection content.
- `STK-CAN-005` — Renderer principle (general Living Law): **canon ≠ renderer**. Canon never
  assumes a rendering technology.
- `STK-CAN-006` — Seasonal identity only: `vasanta` (order 1) → `grishma` (order 2), one-way,
  no other season authorized. Identity only — no environmental parameter is Canon.

**Specifications (`studiok-specifications/living-vrindavan`, all `Approved`, vendored
checksum-pinned into the runtime at `lib/livingWorldRuntime/vendor/`):**

- `STK-SPEC-002` (`living-vrindavan.world.json`) — structural transcription of STK-CAN-001, plus
  `humanQuestion` (STK-CAN-003) and `reflectionCapable` (only `yamuna: true`).
- `STK-SPEC-004` (`living-vrindavan.experience.json`) — the **existing** presentation-intent
  layer: per-location `environment.biome`, `atmosphere.quality`, `soundscape.motifs`,
  `interaction.reflectionAvailable`, `presentation.{intensity,pacing}`, plus transition
  affordances.
- `STK-SPEC-006` (`living-vrindavan.systems.json`) — seasonal environmental envelopes (bands, not
  raw values), two **StudioK-canonical entity archetypes** (`riverbank-vegetation` at `yamuna`,
  `ambient-bird-flock` at `kadamba-grove`, both lifecycle-phase-only), and four `EncounterRule`s.

**Runtime (`avatark-platform-web`, real code, all already exercised by passing tests):**

- Sprint 10 `lib/livingPopulation/vrindavanPopulationDefinition.ts` — a **second, deliberately
  separate** Host-authored roster: `avatark-population-cow` (2 individuals, at `yamuna`) and
  `avatark-population-bird-flock` (2 individuals, at `kadamba-grove`), each with capabilities,
  need dimensions, a rhythm schedule, and `groupKind` (`herd`/`flock`). Resource affordances:
  `yamuna→water`, `kadamba-grove→vegetation,shelter,rest`, `govardhan-path→gathering,corridor`,
  `vrindavan-entry→` (none).
- Sprint 12 `lib/socialEcology/vrindavanSocialDefinition.ts` — one relationship
  (`PARENT_OFFSPRING`, band `WEAK`, between the two cows), two `GroupMembership` sets
  (`REFERENCE_ENTITY`/`MEMBER`, explicitly *not* a leadership claim), two `HomeRange`s (each
  group's own seed location).
- Sprint 13 `lib/livingRhythms/vrindavanRhythmsDefinition.ts` — a world-shared 7-phase day
  (`DAWN…NIGHT`, 14 ticks/cycle) and per-archetype `DailyRhythmDefinition`s (tendency, not
  schedule) — cow: `MORNING` graze/drink → `DUSK`/`NIGHT` rest; bird-flock: `MORNING` socialize
  (at Govardhan Path's `gathering`) → `AFTERNOON` corridor travel → `DUSK` rest (back at Kadamba
  Grove).
- Sprint 11 `lib/worldMemory/vrindavanMemoryDefinition.ts` — one significance config
  (`scarcityBands: ["low"]`) and exactly **two** emergent-encounter rules, **both at
  `kadamba-grove`** (recent population movement; recent reunion).
- Sprint 15 `lib/worldAdaptation/vrindavanAdaptationDefinition.ts` — five bounded rules (A–E:
  entity resource-preference bias, relationship interaction-likelihood bias, place
  encounter-eligibility, place resource-pressure with `findAlternateLocationForCategory`,
  world-possibility encounter-weight).
- Sprint 16 `lib/spatialEcology/vrindavanSpatialDefinition.ts` — the full
  Domain→Sector→Quadrant→Patch→LocalPlace hierarchy. Sector/Quadrant are **deliberately
  degenerate** (Canon authorizes no finer subdivision at "~500 m × 500 m"). Patch and LocalPlace
  are each 1:1 with the four Approved locations. `habitatType`: `threshold` / `riverbank` /
  `grove` / `corridor-path`.
- Sprint 17 Phase 0 (`8018899`) — found a **real, unfixed** crash-recovery gap in the composed
  wake chain (`lastActiveAt` bumped before dependent layers persist). Sprint 18 implementation
  prep confirms this is still a live blocker as of this writing.
- Sprint 18 `lib/canonicalEvents/vrindavanCanonicalEventDefinition.ts` — the **only** canonical
  event fixture, explicitly Host-authored and **not** an Approved Canon artifact
  (`provenance.canonDocIds: []`), representing "Krishna lifting Govardhan Hill." Not a precedent
  to author against.

**Build 01, Part 1 (`d313eb3`, CLOSED — Part 2 in progress elsewhere, read-only):**

- Confirms the above ground truth verbatim and adds one load-bearing honest finding for this
  document: **`vegetationCondition`/`hydrologyCondition` on `PatchState` are the same
  world-global band on every Patch** — Sprint 16 Phase 0's own documented scope limit, no
  Canon-authorized per-habitat environmental weighting exists. What genuinely differs per Patch
  at tick 0 is `resourceAvailability` and `presentEntityIds`. This directly shapes §6/§8 below.
- Flags Phase P (canonical presence) as an open, unresolved choice for Part 2 — treated here as
  **PROVISIONAL**.

No item in this document invents a location, season, species, character, ritual, or theological
claim beyond what the above already authorizes.

---

## 1. Content Ownership Boundary

Four layers, deliberately kept from collapsing into each other — this separation already exists
in the real repository structure; this document names it explicitly so Build 03 content stays on
the correct side of it.

| Layer | Owner | Real examples | Change requires |
|---|---|---|---|
| **A. Canonical content** | Founder/Architecture, via `studiok-canon` | Location identity, human questions, season identity, the two Living Laws | New/amended `STK-WO-###` Work Order + Founder/Architecture sign-off |
| **B. Living-world content** | Host (`avatark-platform-web`), "Host-layer, non-canonical, systems-config judgment call" (the exact phrase every `vrindavan*Definition.ts` file already uses) | Population/social/rhythm/memory/adaptation/spatial definitions | Normal engineering PR review — **unless** it asserts a Canon-level fact (see §28) |
| **C. Presentation intent** | Host, derived from Canon+B, currently `STK-SPEC-004` (StudioK-authored) plus any Host-authored sensory extension | Biome, atmosphere quality, soundscape motifs, intensity/pacing | Same as B, unless it contradicts `STK-SPEC-004` |
| **D. Renderer assets** | Build 02 / StudioK art direction | Meshes, textures, VFX, audio files | Out of scope for this document entirely |

**Rule this document enforces throughout:** a renderer asset (D) may never become Canon (A) or
simulation truth (B); a Host-layer judgment call (B/C) may never assert a fact only Founder/
Architecture is authorized to assert (A). Every recommendation below is tagged with which layer
it lives in.

---

## 2. Authorized-Content Scope

Build 03 may author, within Layer B/C only, and only where it composes an *existing* contract
package (`@avatark/living-population-contracts`, `@avatark/social-ecology-contracts`,
`@avatark/living-rhythms-contracts`, `@avatark/world-memory-runtime`,
`@avatark/world-adaptation-contracts`, `@avatark/spatial-ecology-contracts`) or extends
`STK-SPEC-004`'s presentation shape:

- new **microhabitat labels** (descriptive, not a new simulated tier — see §6)
- new **vegetation/animal archetype definitions**, additive to the existing two rosters (§7–§11)
- new **resource-tag usage**, reusing the six tags already in play (§14)
- new **routine (`DailyRhythmDefinition`) entries**, especially filling the real `MIDDAY`/
  `EVENING` gap (§13, §35)
- new **emergent-encounter rules**, reusing `EmergentEncounterRule`'s existing shape (§17, §20)
- new **sensory-intent content**, reusing `STK-SPEC-004`'s existing fields (§22–§24)

Nothing here is authorized unless it is compatible with the ground truth above. Where it is not,
§4 lists the prohibition explicitly, and §42 lists the STOP gates.

---

## 3. Prohibited Invention Boundary

Restated from the mission brief, cross-checked against the real Canon read above — **none of the
following exist anywhere in Canon today**, and Build 03 must not create them:

Krishna actions · Radha actions · Nanda/Yashoda narrative events · sacred rituals · miracles ·
theological claims · named sacred places beyond the four Approved locations · historical claims ·
canonical dialogue · unsupported festivals · unsupported divine presence.

If any of these become necessary for a future build, the correct action is to flag it for a new
`STK-WO-###` and StudioK Canon authoring — never to fabricate it inside a Host-layer definition
file. Sprint 18's own canonical-event fixture is the cautionary example already in the codebase
(§37).

---

## 4. Local Place Content Matrix

The complete, real set — no new place name. `resourceAvailability`/`presentEntityIds` are the
two fields Build 01 confirmed genuinely differentiate Patches today; everything else below is
authored content, some real, some a Build 03 recommendation (marked).

| Field | `vrindavan-entry` | `yamuna` | `kadamba-grove` | `govardhan-path` |
|---|---|---|---|---|
| Habitat type (real) | `threshold` | `riverbank` | `grove` | `corridor-path` |
| Biome (real, `STK-SPEC-004`) | `threshold` | `riverbank` | `grove` | `path` |
| Atmosphere quality (real) | `arrival` | `contemplative` | `intimate` | `purposeful` |
| Resource tags (real) | none | `water` | `vegetation`, `shelter`, `rest` | `gathering`, `corridor` |
| StudioK systems archetype (real, Canon-adjacent) | none | `riverbank-vegetation` | `ambient-bird-flock` | none |
| Host population presence (real) | none | cow herd (2, home range) | bird flock (2, home range) | bird flock (transient, `MORNING`/`AFTERNOON`) |
| Group tendency (real) | none | herd cohesion 1 | flock cohesion 1 | flock passes through |
| Routine tendency (real) | none | cow: graze/drink `MORNING` | cow: rest `DUSK`/`NIGHT`; bird-flock: rest `DUSK` | bird-flock: socialize `MORNING`, corridor `AFTERNOON` |
| Occupancy rhythm (real) | static | busiest `MORNING` | busiest `DUSK`–`NIGHT` (cow rest) and ambient-presence-eligible | busiest `MORNING`–`AFTERNOON` |
| Static encounter rules (real, `STK-SPEC-006`) | none | `yamuna-flowering-reflection`, `yamuna-narrative-gate` | `kadamba-grove-ambient-presence` | `govardhan-path-practice-linked` |
| Emergent encounter rules (real) | none | **none** (gap, see §17) | recent-arrival, recent-reunion | **none** (gap, see §17) |
| Reflection affordance (real) | no | **yes** — only Approved reflection-capable location | no | no |
| Sensory motifs (real) | none (gap) | `flowing-water` | `grove-ambience` | none (gap) |
| Presentation intensity/pacing (real) | restrained / slow | restrained / slow | restrained / slow | standard / moderate |
| Season sensitivity (real, world-global band, not per-Patch) | low — threshold is deliberately minimal-ecology by Canon design | high — hosts the only hydrology-linked static rule | moderate — hosts the only animal-activity-linked static rule | low-discriminating today (§35 gap) |
| Recommended microhabitats (Build 03, §6) | open ground, path corridor | riverbank, shallow-water edge, wet ground, feeding patch | grove interior, grove edge, shade patch, resting patch | path corridor, open grass, dry ground |
| Prohibited content | none beyond §3 | none beyond §3; do not add a second reflection-capable location without Founder/Architecture authorization (Canon names only Yamuna) | none beyond §3; do not name a "Kadamba" fact beyond what STK-CAN-001's own location name already carries (§7) | none beyond §3 |

---

## 5. Microhabitat Vocabulary

**Design decision, stated up front:** microhabitats are a **descriptive, renderer-neutral
labeling vocabulary for content placement within a LocalPlace — not a new simulated spatial
tier.** Build 01 confirmed `PatchState`'s environmental fields are world-global, not per-Patch;
inventing a per-microhabitat *simulated* state would require a new runtime engine, which is an
explicit STOP gate (§42). Microhabitats therefore carry no queryable runtime state of their own —
they are metadata a vegetation/animal archetype definition or a presentation-intent entry can
reference (e.g., "grove canopy prefers grove-interior"), consumed only by content authoring and,
downstream, by Build 02's placement logic. If a future build genuinely needs per-microhabitat
*simulated* state, that is new engine work requiring its own Phase 0, not something this document
authorizes.

| Microhabitat | Parent LocalPlace(s) | Neutral ecological meaning |
|---|---|---|
| `riverbank` | `place-yamuna` | The vegetated edge zone bordering moving water |
| `shallow-water-edge` | `place-yamuna` | Where land ecology meets water directly |
| `wet-ground` | `place-yamuna` | Soil saturated by proximity to water |
| `feeding-patch` | `place-yamuna`, `place-kadamba-grove` | Where a resource affordance (water, vegetation) is locally concentrated |
| `grove-interior` | `place-kadamba-grove` | Canopy-covered core, filtered light, quieter |
| `grove-edge` | `place-kadamba-grove` | Transition zone between canopy and open ground |
| `shade-patch` | `place-kadamba-grove` | Localized cover, relevant to the `shelter` resource tag |
| `resting-patch` | `place-kadamba-grove` | Localized cover, relevant to the `rest` resource tag |
| `path-corridor` | `place-govardhan-path` | Linear movement-oriented ground, matches the `corridor` resource tag |
| `open-grass` | `place-vrindavan-entry`, `place-govardhan-path` | Open, low ground cover, minimal ecological complexity |
| `dry-ground` | `place-vrindavan-entry`, `place-govardhan-path` (more pronounced in Grīṣma) | Ground without significant hydrology relationship |

Every microhabitat resolves to one of the four real LocalPlace IDs. None introduces a new
resource tag, spatial ID, or Canon location.

---

## 6. Vegetation Archetypes

Small grammar, per the mission's own restraint instruction — and deliberately reconciled with,
not duplicated against, the one vegetation archetype Canon-adjacent StudioK content already
defines.

| Archetype | Status | Habitat preference | Hydrology sensitivity | Season sensitivity | Resource role | Density semantics | Ecological interaction | Presentation intent |
|---|---|---|---|---|---|---|---|---|
| **`riverbank-vegetation`** | **Already Approved** (`STK-SPEC-006`), preserve as-is | `yamuna` / riverbank | High — its lifecycle is the direct Grīṣma-readiness signal (§35) | High — `flowering` phase gates `yamuna-flowering-reflection` | Contributes to the `water` place's edge character | N/A — lifecycle phase (`dormant`/`budding`/`flowering`/`seeding`), not a density band | Its `flowering` phase is the only vegetation state with a live encounter-rule dependency | Do not add a second lifecycle track; this archetype already owns Yamuna's vegetation identity |
| **`grove-canopy`** (Build 03, new, Layer B) | Host-authored, additive | `kadamba-grove` / grove-interior, grove-edge | Low | Moderate — presents denser at `vegetationActivityBand: high`, sparser at `moderate` (Grīṣma) | Backs the `shelter` and `rest` tags | Density band (`sparse`/`moderate`/`dense`), reused from the existing world-global `vegetationActivityBand`, never a new per-archetype value | None yet wired to an encounter rule — a legitimate future extension, not required for Build 03 | Overhead cover, filtered light, "intimate" atmosphere per `STK-SPEC-004` |
| **`understory`** (Build 03, new, Layer B) | Host-authored, additive | `kadamba-grove` / grove-interior | Low | Low | Minor cover; not a primary resource backer | Density band, same reuse as above | None | Texture/sound richness at close range — matches Kadamba Grove's own Canon purpose ("attention to life at close range") |
| **`grass-ground-cover`** (Build 03, new, Layer B) | Host-authored, additive | `vrindavan-entry`, `govardhan-path` / open-grass, dry-ground | Low | Moderate — visibly reduced at `vegetationActivityBand: moderate` (Grīṣma) | None (Entry/Path affordances are deliberately empty/`gathering`,`corridor`) | Density band | None | Neutral open-ground presentation |

**Explicitly not separate archetypes** (naming discipline, per the mission's own instruction not
to invent species merely for richness):

- **"Flowering vegetation"** is not a new archetype — it is `riverbank-vegetation`'s own
  already-Approved `flowering` lifecycle phase. A parallel flowering archetype would duplicate
  StudioK's own content.
- **"Dry-season stressed vegetation"** is not a new archetype either — it is how
  `grass-ground-cover` and `grove-canopy` *present* under Grīṣma's lower `vegetationActivityBand`
  (a **state**, see §7), not a fourth definition.

**On the name "Kadamba":** STK-CAN-001 already names the location "Kadamba Grove" as Approved
Canon. Treating the grove's own canopy as (unnamed, generic) "kadamba canopy" preserves a fact
Canon already asserted through the location's own name — it does not introduce a new
culturally-significant species. No other archetype above carries a named species; that
restraint is deliberate (§39).

---

## 7. Vegetation State

**Definition** (archetype-level, static, §6 above) is kept strictly separate from **State**
(place-level, dynamic) — and State reuses the existing `PatchState` contract rather than
inventing a parallel vegetation simulation, per the mission's explicit instruction.

Honest constraint, restated from Build 01's own finding: **`PatchState.vegetationCondition` is
one world-global band today, not a per-Patch or per-archetype value.** Build 03's authored State
mapping is therefore: *for a given archetype at a given Place, what does the world's current
`vegetationActivityBand` mean, presentation-wise, for that archetype* — not a second, finer-grain
band. Concretely:

| `vegetationActivityBand` (real, world-global) | `riverbank-vegetation` (real lifecycle phase implication) | `grove-canopy` presentation (Build 03) | `grass-ground-cover` presentation (Build 03) |
|---|---|---|---|
| `high` (Vasanta) | flowering-eligible | dense | full |
| `moderate` (Grīṣma) | budding/seeding-range, not flowering | moderate | reduced |
| `low` (not currently reachable — no third season) | dormant-range | sparse | minimal |

No new repository, no new write path, no new field on `PatchState` — this table is authoring
guidance for how existing bands should be *read*, consumed only by presentation (Layer C) and,
downstream, Build 02.

---

## 8. Animal Archetypes

**Two real, deliberately separate rosters must not be merged.** This is the single most
important reconciliation this document performs, because both rosters happen to place a
"bird flock" at `kadamba-grove`:

1. **StudioK systems archetypes** (`STK-SPEC-006`, Approved, Layer A-adjacent): `ambient-bird-flock`
   at `kadamba-grove` — a lifecycle-phase entity (`dispersed`/`present`/`departed`) stepped by the
   generic ecological-lifecycle mechanism (Sprint 7–9), gating the `kadamba-grove-ambient-presence`
   encounter rule. No behavior, no rhythm, no memory, no relationship.
2. **Host population archetypes** (`vrindavanPopulationDefinition.ts`, Layer B): `cow` and
   `bird-flock` — individually-identified `LivingEntityState`s with capabilities, need pressure,
   rhythm, group membership, relationship and adaptation eligibility.

These represent the same conceptual creature at two different simulation layers, by original
design (the population definition file's own comment is explicit about this being a "SEPARATE
roster"). Build 03 preserves the split.

| Archetype | Layer | Stable ID | Habitat affinity | Grouping | Daily rhythm | Resource needs | Movement tendency | Social behavior | Encounter eligibility | Presentation intent |
|---|---|---|---|---|---|---|---|---|---|---|
| `riverbank-vegetation` | StudioK/A-adjacent | `riverbank-vegetation` | `yamuna` | none (vegetation) | lifecycle phase, not a rhythm | none | none | none | `yamuna-flowering-reflection` when flowering | riverbank presence |
| `ambient-bird-flock` (StudioK) | StudioK/A-adjacent | `ambient-bird-flock` | `kadamba-grove` | none modeled | lifecycle phase | none | none | none | `kadamba-grove-ambient-presence` when present | ambient bird presence, no individual identity |
| `avatark-population-cow` | Host/B | `avatark-population-cow` | `yamuna` (home), `kadamba-grove` (rest destination) | `herd`, cohesion-tracked | `MORNING` graze/drink → `DUSK`/`NIGHT` rest | hunger, thirst, rest, social | movement bias 0.15 (morning), 0.1 (dusk), 0 (night) | `can_group`, `PARENT_OFFSPRING` relationship modeled | via adaptation/memory, not a static rule | individually-identified, small herd |
| `avatark-population-bird-flock` (Host) | Host/B | `avatark-population-bird-flock` | `kadamba-grove` (home), `govardhan-path` (transient) | `flock`, cohesion-tracked | `MORNING` socialize → `AFTERNOON` corridor travel → `DUSK` rest | hunger, rest, social | movement bias 0.1 (morning), 0.3 (afternoon), 0 (dusk) | `can_flock`, no relationship modeled yet | via memory (kadamba-grove only) | individually-identified, small flock; renderer may realize as more numerous |

**Small ambient fauna** — the mission's third example category — is **not currently authorized by
any archetype**. No third simulated entity type is recommended. Per §32 (perceived density), the
correct Build 03 treatment is representing "small ambient fauna" (insects, incidental birdsong)
through the **audio taxonomy** (§24) and **presentation intent** (§22), not through a new
persistent entity type. This keeps the initial population small (§31) and avoids the "ecological
behavior needs a new runtime engine" STOP gate for something that can be fully served by ambience.

---

## 9. Herd Model (Cattle)

Real, already-implemented, treated here as the flagship persistent population — no new
individual/group ID is proposed.

- **Individual identity:** `avatark-population-cow-1`, `avatark-population-cow-2` — each a real,
  continuity-proven (`vrindavanEntityContinuity.test.ts`, Build 01) `LivingEntityState`.
- **Herd identity:** `avatark-population-cow-herd`, cohesion `1`, `GroupState.locationId: yamuna`.
- **Home range:** `yamuna` (the herd's own seed location) — this is a **"frequent," not "own"**
  relationship, per Sprint 12's vocabulary discipline.
- **Water dependency:** `thirst` need dimension, `DRINK` activity, `water` resource tag — resolved
  locally at `yamuna` (the herd's home range affords water directly).
- **Grazing resource — a real, existing asymmetry, not a Build 03 invention:** the cow's
  `MORNING` routine's `eligibleActivities` include `GRAZE` with `preferredResourceTypes:
  ["vegetation", "water"]`, but `yamuna` (the herd's own home range) affords only `water` —
  `vegetation` lives at `kadamba-grove`. This is exactly the situation Adaptation rule D
  (`RESOURCE_SCARCITY` → `findAlternateLocationForCategory`) exists to bias against; see §16 for
  why this is the flagship resource-causality example, not a bug to fix here.
- **Resting rhythm:** `DUSK`/`NIGHT` rest targets the `rest` tag, which lives at `kadamba-grove`
  — a **second** real asymmetry: the herd's home range (`yamuna`) differs from its own rest
  destination (`kadamba-grove`). Vocabulary: the herd *frequents* Yamuna and *traverses to*
  Kadamba Grove to rest; neither location is "owned."
- **Group cohesion:** tracked via `GroupState.cohesion` (seed value `1`), `targetLocationId`
  available for future movement-toward-target logic.
- **Memory/adaptation hooks:** rule A (entity resource-preference bias, from repeated encounter
  involvement) and rule B (relationship interaction-likelihood bias) both apply to this herd's
  members and their `PARENT_OFFSPRING` relationship.

No sophisticated per-cow AI agent is proposed — the two cows are simple, capability-tagged state
machines whose *group* behavior (movement, rest, drinking) already scales through
`GroupState`/`HomeRange`, matching the mission's explicit "avoid making every animal a
sophisticated autonomous agent" instruction.

---

## 10. Flock Model (Birds)

Real, already-implemented Host-layer flock — distinct from StudioK's own `ambient-bird-flock`
lifecycle entity (§8).

- **Flock identity:** `avatark-population-bird-flock` (group), 2 named members
  (`avatark-population-bird-flock-1`/`-2`).
- **Population band:** today a literal count of 2 — recommend treating this as a **semantic
  control knob** for Build 02's renderer (a flock's true visible bird count may exceed its
  persisted member count; see §32), not a value the runtime needs to change.
- **Current patch / activity band:** driven by the same rhythm mechanism as the herd — home at
  `kadamba-grove`, but its own `MORNING`/`AFTERNOON` routine actually routes it to
  `govardhan-path` (`gathering`, then `corridor`), returning to `kadamba-grove` only at `DUSK` to
  rest. This is real, existing routing, not a Build 03 invention — and it means **Govardhan Path's
  own only real ambient-life signal today is this transient flock passage**, worth naming
  explicitly in Build 02 handoff.
- **Movement tendency / environment response:** movement bias 0.1 (morning) → 0.3 (afternoon,
  its highest of either archetype) → 0 (dusk, resting).

No persistent individual identity is required for every visually-rendered bird — the renderer may
realize dozens from these two semantic members, per the mission's own instruction. Do not treat a
larger visible flock as requiring a proportionally larger persisted-entity count.

---

## 11. Individual vs. Group vs. Aggregate Policy

| Tier | Criterion | Real example | Persistence/cost implication |
|---|---|---|---|
| **Individual entity** | Needs continuity, relationship-eligibility, or entity-level adaptation attached to it specifically | `avatark-population-cow-1`/`-2` (each carries its own memory/adaptation/relationship state) | One `LivingEntityState` row per individual — cheap at current scale (4 total) |
| **Group entity** | Members move/rest/socialize together under one cohesion/home-range/target, individuals still separately identified underneath | `avatark-population-cow-herd`, `avatark-population-bird-flock` | One `GroupState` + `HomeRange` per group, referencing existing member IDs — no duplication |
| **Population aggregate** | Presence/absence/phase only; no persistent individual identity; renderer may multiply visually | `riverbank-vegetation`, `ambient-bird-flock` (StudioK systems archetypes) | One lifecycle-phase record per archetype instance — cheapest tier |

**Honest note:** the current Vrindavan seed does not yet contain a *pure* aggregate at the
population layer — both Host archetypes chose small, individually-identified groups (2+2) rather
than an aggregate. This was a deliberate, real Sprint 10 choice for a "deliberately small" initial
population (§31), not evidence that aggregates are unsupported. **Future population growth should
scale through the aggregate tier (or larger `GroupState.memberEntityIds`) rather than by linearly
adding named individuals** — the cost/perf concern the mission's §12/§32 are pointing at.

---

## 12. Ambient Human Life

**Gap, honestly documented — no ambient human archetype is authorized or proposed.** Canon does
not name a human population anywhere; STK-CAN-002's Participant Cycle frames the *only* human
presence as the visitor themself. No `human`/`villager` archetype exists in either the StudioK
systems artifact or the Host population definition. Per the mission's own instruction, Build 03
does **not** invent neutral villager roles to fill this gap — it is recorded here as an open
question for a future `STK-WO-###` if StudioK/Founder ever wants ambient human presence.

**Protected canonical characters:** none appear anywhere in current Canon as named entities — no
Krishna, Radha, Nanda, or Yashoda record exists in any repository, systems artifact, or
population roster read for this document. Sprint 18's own canonical-event fixture names "Krishna
lifting Govardhan Hill" only as a pending, unapproved Host fixture (§37) — it is not a character
record and must never become one via the ordinary entity roster. **Standing rule for any future
Canon batch that does authorize a named character:** it must never enter
`vrindavanPopulationDefinition.ts`'s ordinary `EntityBehaviorProfile`/`GroupState` roster — a
protected character requires its own distinct mechanism (the canonical-events subsystem, §37),
never simulation as an ordinary population entity.

---

## 13. Daily Rhythms

Uses Sprint 13's real `DailyRhythmDefinition` shape and the real 7-phase world day
(`DAWN`/`MORNING`/`MIDDAY`/`AFTERNOON`/`DUSK`/`EVENING`/`NIGHT`, 14 ticks/cycle). No new phase
vocabulary.

| Archetype | `DAWN` | `MORNING` | `MIDDAY` | `AFTERNOON` | `DUSK` | `EVENING` | `NIGHT` |
|---|---|---|---|---|---|---|---|
| Cow (real) | — | GRAZE/DRINK, `vegetation`+`water`, movement 0.15 | **gap** | — | REST, `rest`, movement 0.1 | — | REST, `rest`, movement 0 |
| Bird-flock (real) | — | SOCIALIZE, `gathering`, movement 0.1 | **gap** | MOVE_TO_RESOURCE/FOLLOW_GROUP, `corridor`, movement 0.3 | REST, `rest`, movement 0 | — | — |

**The `MIDDAY`/`EVENING`/`DAWN` gaps are real and current** — neither archetype has an authored
tendency for these phases today (behavior selection presumably falls through to whatever default
the engine uses absent a matching entry). This is not a defect this document is asked to fix, but
it is the **single concrete content delta** Build 03 recommends authoring for Grīṣma-readiness
(§35): a `MIDDAY` entry for both archetypes biasing toward `shelter`/`rest`/`water` with reduced
`movementBias`, reusing the existing rhythm mechanism, no engine change.

No renderer-specific animation is specified anywhere in this section, per the mission's
instruction — only tendency/eligibility data.

---

## 14. Resource System

The complete, real set of `ResourceTag` values currently in use — six, not the mission's larger
illustrative list:

| Tag | Where affirmed | Consumed by |
|---|---|---|
| `water` | `yamuna` | cow `DRINK` |
| `vegetation` | `kadamba-grove` | cow `GRAZE` (see §9's real asymmetry) |
| `shelter` | `kadamba-grove` | not yet consumed by a routine entry — available for the §35 `MIDDAY` recommendation |
| `rest` | `kadamba-grove` | cow/bird-flock `REST` |
| `gathering` | `govardhan-path` | bird-flock `SOCIALIZE` |
| `corridor` | `govardhan-path` | bird-flock `MOVE_TO_RESOURCE`/`FOLLOW_GROUP` |

**Recommendation, not addition:** the mission's illustrative "shade" and "cover" are not proposed
as new tags — `shelter` (already real, already at Kadamba Grove) already carries that meaning.
Likewise "social congregation area" is already `gathering`. Keeping the vocabulary at six tags
avoids a parallel, redundant resource taxonomy (a §42 STOP-gate risk: "content schema duplicates
existing runtime contracts").

No game-style collectible economy exists or is proposed — every tag above backs a believable
behavior (drink, graze, rest, gather, travel), never a score.

---

## 15. Resource → Behavior Causality

Two real, already-wired causal patterns — no new causal engine:

1. **Scarcity → alternate-location bias** (real, Adaptation rule D): a `(locationId,
   resourceCategory)` pair observed persistently unavailable accrues pressure, biasing entities
   currently present toward `findAlternateLocationForCategory`'s result. This is the exact
   mechanism the cow herd's own `vegetation`-at-`yamuna` gap (§9) is positioned to exercise: a
   cow persistently unable to graze locally is the world's own "water availability drops → route
   preference changes" pattern, already present in real code, restated for a different resource.
2. **Heat → shelter preference** (recommended content, not yet wired): no rule currently
   connects `temperatureBand`/season to a shade-seeking tendency. Rather than propose a new
   causal mechanism, Build 03 recommends the §13/§35 `MIDDAY` rhythm-entry content change as the
   concrete realization of "heat rises → shade preference increases" — it composes the *existing*
   rhythm + resource-affordance mechanism (a routine simply preferring `shelter`/`rest` at
   `MIDDAY`), reusing exactly what rule D already reads, with zero new engine surface.

---

## 16. Place Attachment

Reuses Sprint 12's real `HomeRange` contract (`ownerType: GROUP`, `preferredLocationIds`) and
vocabulary discipline exactly as implemented — `frequent`, never `own`.

| Group | Frequents (home range) | Traverses to | Avoids | Shares |
|---|---|---|---|---|
| Cow herd | `yamuna` | `kadamba-grove` (rest) | n/a | n/a |
| Bird flock | `kadamba-grove` | `govardhan-path` (morning/afternoon) | n/a | n/a |

Yamuna is additionally the world's own hydrology hub — both other reachable locations sit
`DOWNSTREAM_OF` it in the real spatial-edge graph. Any new archetype's home range must resolve to
one of the four real LocalPlace IDs; no ownership language is introduced.

---

## 17. Memory

Uses Sprint 11's real bounded significance/emergent-encounter mechanism exactly as implemented —
no unlimited event history, no new memory engine.

**Real, current footprint is small and asymmetric:** both existing emergent-encounter rules are
at `kadamba-grove` only (recent population movement; recent reunion). **Yamuna and Govardhan Path
currently have zero emergent rules** — a real gap, not a design requirement.

**Recommended additive content (Layer B, reuses `EmergentEncounterRule`'s existing shape
verbatim):**

- `avatark-population-recent-watering-yamuna` — category `ambient`, `requiresLocationId:
  "yamuna"`, `requiresEventCategory: "POPULATION_MOVEMENT"`, `withinLastTicks: 10` — the direct
  Yamuna parallel to Kadamba Grove's own existing rule, giving the herd's own home range an
  ambient encounter opportunity of its own.

Memory is authored only where it can plausibly influence later behavior (via Adaptation, §18) —
resource scarcity and successful/failed watering are the only kinds of experience recommended,
matching the mission's own restraint instruction.

---

## 18. Adaptation

Uses Sprint 15's real five rules (A–E) exactly as implemented; no personality simulation is
proposed. Restated for completeness (already detailed in Ground Truth above): entity
resource-preference bias, relationship interaction-likelihood bias, place encounter-eligibility,
place resource-pressure (the §15 mechanism), world-possibility encounter-weight. All bounded,
decaying, and — except rule C — reversible. Build 03 proposes **no sixth rule**; the existing five
already cover entity/relationship/place/resource/world-possibility, one per mission-required
category, and adding a rule "merely to populate every conceivable domain × kind combination" is
explicitly the anti-pattern Sprint 15's own documentation already rejected.

---

## 19. Social Ecology

Uses Sprint 12's real, deliberately small footprint: one relationship (`PARENT_OFFSPRING`, cows),
group cohesion tracked per `GroupState`, `REFERENCE_ENTITY`/`MEMBER` membership roles explicitly
**not** a leadership claim. No dominance/hierarchy system is proposed — the mission's own
restraint instruction ("do not overbuild dominance/hierarchy without world need") is already
satisfied by the real implementation, and no world need for more has emerged from this content
review. Territorial overlap is not applicable at four Patches with no Sector/Quadrant
subdivision.

---

## 20. Encounter Opportunities

Real static rules (all from `STK-SPEC-006`, Approved): `yamuna-flowering-reflection`
(environmental), `kadamba-grove-ambient-presence` (ambient), `govardhan-path-practice-linked`
(practice-linked), `yamuna-narrative-gate` (**narrative-protected — never author against this
one; it is StudioK's own Canon-firewall gate**). Plus the two real emergent rules (§17) and the
one recommended addition there.

Build 03 authors **eligibility conditions and semantic meaning only** for new *ambient*/
*environmental* category rules — never narrative-protected content, and never a rule that would
require inventing a canonical event to justify it. `govardhan-path`'s relative encounter-poverty
(one static rule that is barely season-discriminating, per §35's observation, and zero emergent
rules) is worth naming as a content gap for a future author, not something this document
proposes filling beyond §17's Yamuna recommendation.

---

## 21. Visitor Relationship to Ambient Life

Conservative, and already naturally satisfied by real code: the existing `InteractionIntent`
union (`EnterWorldIntent`/`LeaveWorldIntent`/`VisitLocationIntent`/`BeginReflectionIntent`/
`SelectEncounterIntent`, Sprint 14/19) already models exactly `observe`/`approach`/`follow
path`/`remain nearby`/`begin reflection` — no new intent is needed for Build 03's authoring
scope. No `EntityBehaviorProfile` anywhere grants a capability like feed/touch/herd/disturb/
collect — this is a real, current absence, and Build 03 recommends it stay that way: **do not
author any ambient-life content that implies a manipulation capability** the population contracts
do not already model.

---

## 22. Sensory Intent

Reuses `STK-SPEC-004`'s existing presentation-intent fields exactly — `environment.biome`,
`atmosphere.quality`, `soundscape.motifs`, `presentation.{intensity,pacing}`. No new field, no
Unreal/asset binding.

**Real gap:** `vrindavan-entry` and `govardhan-path` currently have **empty** `soundscape.motifs`
arrays; only `yamuna` (`flowing-water`) and `kadamba-grove` (`grove-ambience`) have any. This is
the natural place for Build 03's audio-taxonomy content (§24) to attach — filling the gap with
category-level motifs, not asset selections.

---

## 23. Audio Content Taxonomy

| Category | Type | Real/recommended attachment |
|---|---|---|
| River water | continuous ambience | `yamuna` — real motif `flowing-water` |
| Wind | continuous ambience | recommended addition at `vrindavan-entry` (currently empty) |
| Foliage movement | continuous ambience | folded into `grove-ambience` at `kadamba-grove` (real) |
| Birds | entity sound | flock-linked, present at `kadamba-grove` (home) and transiently at `govardhan-path` (recommended addition, matching the real §10 routing) |
| Cattle | entity sound | herd-linked, `yamuna` |
| Distant pastoral ambience | continuous ambience | recommended addition at `govardhan-path` (currently empty) |
| Footsteps | event cue | visitor-linked, all locations, renderer-owned |
| Insects | continuous ambience | folded into `grove-ambience` (recommended sub-tag, not a new archetype — see §8's "small ambient fauna" decision) |
| Night ambience | continuous ambience | world-wide, `NIGHT` day-phase-linked |

Canonical authored sound/music: **none exists, none is proposed.** Any future addition of
music/mantra content is a Canon-level decision (§39), not a Build 03 audio-taxonomy entry.

---

## 24. Visual Content Taxonomy

Category-level only — no asset selection, no Unreal binding, per the mission's explicit
instruction.

| Category | Classification | Cultural sensitivity |
|---|---|---|
| Terrain | prototype placeholder acceptable | none |
| Riverbank | prototype placeholder acceptable | none |
| Ground cover | marketplace candidate | none |
| Trees (generic) | marketplace candidate | none, **except** any tree presented as Kadamba Grove's own canopy — see below |
| Kadamba canopy specifically | StudioK art direction required | **Yes** — the location's own Approved Canon name carries devotional association; treat as custom/art-directed, not a generic marketplace tree (§39) |
| Grass | marketplace candidate | none |
| Flowers | marketplace candidate, unless tied to `riverbank-vegetation`'s `flowering` phase, then prototype acceptable pending StudioK review | low |
| Rocks | marketplace candidate | none |
| Paths | marketplace candidate | none |
| Pastoral props (e.g. water vessels, simple structures) | marketplace candidate, customization likely | low — verify none implies an unauthorized ritual object |
| Animal meshes — cow | marketplace candidate acceptable for prototype, **flag for cultural-sensitivity review before final** | **Yes** — the cow carries real devotional significance in the Krishna tradition even though the Host archetype is authored as neutral livestock; do not treat as generic livestock in final art direction |
| Bird representations | marketplace candidate | none |
| Ambient particles | prototype placeholder acceptable | none |
| Sky/weather | marketplace candidate | none |

---

## 25. Marketplace Asset Category Matrix

No product is named or purchased here — category guidance only, for Build 02's later use.

| Category | Purpose | Minimum quality | Prototype acceptable? | Customization likely? | Cultural/canonical sensitivity | Performance concern |
|---|---|---|---|---|---|---|
| Terrain/ground | base world surface | low-medium | yes | low | none | LOD critical at 500m×500m scale |
| Riverbank/water | Yamuna's identity surface | medium | yes initially | medium | low | shader/water-sim cost |
| Grove vegetation (canopy) | Kadamba Grove's identity | medium-high | no — art-directed | high | **high** (§24) | instancing cost at density |
| Ground cover/grass | fill, all places | low | yes | low | none | instancing/LOD cost |
| Path/corridor surface | Govardhan Path's identity | low-medium | yes | low | none | none significant |
| Cow mesh + animation | flagship persistent population | medium-high | yes initially | medium | **high** (§24) | low count (2), cheap |
| Bird mesh + flock behavior | flagship persistent population | low-medium | yes | low | low | flock rendering cost scales with §32's perceived-density choice, not persisted count |
| Pastoral props | ambient richness | low | yes | high | low-medium | low |
| Sky/weather/atmosphere | Vasanta/Grīṣma seasonal identity | medium | yes | medium | none | shader cost |
| Ambient particles (pollen, dust) | perceived density (§32) | low | yes | low | none | can be numerous but cheap if simple |

---

## 26. Artifact / Data Format

**Decision: do not invent a new portable-artifact JSON family.** The existing pattern already
correctly separates ownership:

- Canon-derived facts stay in StudioK's own portable JSON artifacts (`*.world.json`,
  `*.experience.json`, `*.systems.json`), validated by `studiok-specifications`'s own
  `validate-world-artifact.mjs` and checksum-pinned into the runtime via
  `vendor/manifest.json` + `verifyArtifactIngestion`.
- Everything Build 03 authors (§6–§20) stays exactly where Sprints 10/12/13/15/16 already put
  it: exported `const`s in Host-owned `lib/*/vrindavan*Definition.ts` files, typed against the
  real contract packages. This **is** the "portable artifact" for living-world content — it
  does not need to become JSON to be portable; it already composes generically (proven by every
  "Living Forest" portability fixture cited in the ground truth).

**Genuinely new shapes needed, both intentionally lightweight:**

- **Microhabitat vocabulary** (§5) — a plain, descriptive `Record<MicrohabitatId, {label,
  parentLocalPlaceId, notes}>` map, Host-owned, no runtime query surface. Not a new contract
  package — adding one would trip the §42 STOP gate ("content schema duplicates existing runtime
  contracts") for something with no simulated behavior of its own.
- **Sensory-intent extensions** (§22–§24) — additive entries into `STK-SPEC-004`'s *existing*
  per-location shape (`soundscape.motifs[]` growing, not a new schema), or, if StudioK chooses to
  vend a revision, a `revision`-bumped `STK-SPEC-004`, not a parallel Host-owned sensory schema.

No `population-definition`/`entity-archetype`/`group-definition`/`routine-definition` JSON family
is proposed — those already exist as real TypeScript contracts and would duplicate them if
re-expressed as a new JSON artifact shape.

---

## 27. StudioK Authoring Workflow

```text
Canon boundary (Founder/Architecture, STK-WO-### only if a new fact is asserted)
        ↓
World/ecology authoring (Host-layer judgment call — normal PR review,
                          the SAME posture Sprints 10/12/13/15/16 already used)
        ↓
Living-content specification (this document + any new *Definition.ts)
        ↓
Validation (§28 — module-load-time, same discipline as vrindavanDefinition.ts's own validate())
        ↓
Approval (normal engineering review, UNLESS a Canon-level fact is implied —
          see gate below)
        ↓
Portable artifact (StudioK JSON stays StudioK JSON; Host content stays
                    Host-owned TypeScript — no new intermediate format, §26)
        ↓
Runtime ingestion (existing per-domain hostService.ts/singleton.ts pattern)
        ↓
Renderer presentation (Build 02 — out of scope here)
```

**The one gate that matters:** Founder/Architecture approval and a real `STK-WO-###` are required
**only** when proposed content would assert a new Canon-level fact — a new location, season,
named species, protected character, ritual, or theological claim (§3). Everything this document
actually proposes (§6–§20) is deliberately scoped to avoid that gate, matching the precedent every
existing `vrindavan*Definition.ts` file's own header comment already sets ("Host-layer,
non-canonical, systems-config judgment call"). Where a recommendation brushes against that line
(e.g. §24's Kadamba canopy / cow-mesh cultural-sensitivity flags), it is marked for StudioK art
direction, not silently authored.

---

## 28. Validation

Reuses the exact discipline `lib/livingWorldRuntime/vrindavanDefinition.ts`'s own `validate()`
already applies (fail loudly at module load, not silently at runtime) — extended to every new
Build 03 content file:

- Every archetype ID referenced by a routine/rhythm/adaptation rule resolves to a real archetype
  in one of the two rosters (§8), and the two rosters are never merged into one.
- Every microhabitat label's `parentLocalPlaceId` resolves to one of the four real LocalPlace IDs.
- Every `resourceTag` used by a new routine entry resolves to a real entry in
  `VRINDAVAN_RESOURCE_AFFORDANCES`.
- Every day-phase referenced by a new rhythm entry is a member of the real
  `VRINDAVAN_DAY_PHASE_SCHEDULE` phase set (no new phase invented).
- No location ID outside the real four (`vrindavan-entry`, `yamuna`, `kadamba-grove`,
  `govardhan-path`) appears anywhere.
- No canonical/protected character ID ever appears in the ordinary population/social-ecology
  roster (§12).
- No renderer/asset reference (mesh name, sound file path, Unreal identifier) appears in any
  Layer B/C definition file — those stay in Build 02's domain entirely.
- Any new emergent-encounter rule's `requiresEventCategory` matches a real, already-emitted
  `WorldEvent`/`EncounterRecord` category — never a fabricated one.

---

## 29. Versioning

Layer A content (locations, seasons, human questions) inherits Canon's own real
`Status + Revision` model (`versioning-strategy.md`) untouched by Build 03 — a Build 03 document
never bumps a `STK-CAN-###` revision itself.

Layer B content (population/social/rhythm/memory/adaptation/spatial definitions,
microhabitat/sensory extensions) follows normal code-repo practice informally, but the concrete
concern this section must answer honestly: **an already-provisioned, persistent world instance
must never have its seeded population silently replaced by a later content revision.**
Recommendation (conceptual — no implementation proposed here): a population-definition version
becomes an explicit, checkable fact alongside the world's own checkpoint, mirroring
`vendor/manifest.json`'s real checksum-pinning precedent for StudioK artifacts — a `v2` seed
function must apply only to newly-provisioned world instances; migrating an already-running
instance's seeded population from `v1` to `v2` requires its own explicit, separately-authored
upgrade path. Designing that upgrade path is out of scope here and is flagged as a genuine open
question for whenever live multi-version population content is actually needed.

---

## 30. Initial Population Recommendation

**Keep exactly what is real today — do not grow it for this phase.** Four individually-identified
Host entities (2 cows in 1 herd at `yamuna`, 2 bird-flock members in 1 flock at `kadamba-grove`),
plus two StudioK lifecycle-phase aggregate entities (`riverbank-vegetation` at `yamuna`,
`ambient-bird-flock` at `kadamba-grove`). Build 01 Part 1 already confirmed this small seed
proves continuity, group behavior, movement, occupancy, memory, and adaptation without added
load. No claim of ecological realism is made from these counts — they exist to prove mechanism,
not to simulate a real ecosystem's population density.

---

## 31. Perceived-Density Strategy

Perceived life and persisted-entity count are kept deliberately separate:

- **Persisted entities:** 4 individually-identified + 2 aggregate (today, unchanged, §30).
- **Perceived density levers, all renderer-facing, none requiring new persisted state:** the
  flock's own semantic member count vs. a larger visually-realized count (§10); `grove-ambience`'s
  layered motifs (foliage/birds/insects, §23); `riverbank-vegetation`'s lifecycle motion
  (dormant→budding→flowering→seeding); day/night ambient audio; distant/ambient ecological change
  a visitor notices without a new entity being spawned for it.

Do not require thousands of persisted individual agents to make Vrindavan feel alive — every
lever above is already either real or a lightweight presentation-layer addition.

---

## 32. Local Place Living Signatures

| Place | Dominant environmental signal | Dominant living signal | Movement character | Sound character | Visitor pace | Resource emphasis | Time-of-day difference |
|---|---|---|---|---|---|---|---|
| `vrindavan-entry` | threshold, deliberately minimal | none by design (Canon: "establishes presence rather than challenge") | static | silence/wind (recommended) | slow, restrained | none | none authored |
| `yamuna` | riverbank, flowing water | cow herd (morning activity), `riverbank-vegetation` lifecycle | herd movement, low | flowing water (real) | slow, restrained, only reflection-capable place | water | flowering-eligible only in Vasanta |
| `kadamba-grove` | grove, filtered light | bird flock (dusk-night rest), `ambient-bird-flock` presence, cow rest destination | flock/herd converge at dusk | grove ambience (real) | slow, restrained, "intimate" | vegetation/shelter/rest | ambient-presence-eligible only when `animalActivityBand ≥ moderate` (fails in Grīṣma) |
| `govardhan-path` | path, corridor | bird flock transient passage (morning-afternoon only) | highest movement bias of any place (flock afternoon travel) | none authored (gap, §23) | standard, moderate — the one non-restrained place | gathering/corridor | practice-linked rule barely season-discriminating (§35 gap) |

---

## 33. Vasanta Content

Real envelope: `temperatureBand: moderate`, `precipitationBand: moderate`, `humidityBand:
moderate`, `hydrologyBaselineBand: moderate`, `vegetationActivityBand: high`,
`animalActivityBand: moderate`.

Living-content parameters that respond to it, all real, all already causal:

- `riverbank-vegetation` is flowering-eligible (`vegetationActivityBand: high` satisfies
  `yamuna-flowering-reflection`'s `atLeast: high`).
- `ambient-bird-flock` is present-eligible (`animalActivityBand: moderate` satisfies
  `kadamba-grove-ambient-presence`'s `atLeast: moderate`).
- Cow/bird-flock need-pressure rates apply **unmodified** — no season-modulation of
  `EntityBehaviorProfile.needDefinitions` exists today. This is a real, current scope limit,
  named here rather than silently assumed away.

No other season is authored, per the mission's instruction.

---

## 34. Grīṣma Preparation

Real envelope: `temperatureBand: high`, `precipitationBand: low`, `humidityBand: low`,
`hydrologyBaselineBand: low`, `vegetationActivityBand: moderate`, `animalActivityBand: low`.

Consequences already real and causal, zero new code needed:

- `vegetationCondition`/`hydrologyCondition` bands drop world-globally (Sprint 16's real
  `resolvePatchState`).
- `yamuna-flowering-reflection`'s `atLeast: high` condition now **fails** (band is `moderate`) —
  the flowering-linked reflection opportunity naturally stops without any rule change.
- `kadamba-grove-ambient-presence`'s `atLeast: moderate` condition now **fails**
  (`animalActivityBand: low`) — ambient bird presence naturally becomes ineligible.
- `govardhan-path-practice-linked`'s `atLeast: low` condition still **passes** even at
  `temperatureBand: high` — a real, minor observation that this rule is barely
  season-discriminating; not a defect this document proposes fixing.

**The one genuine content delta Build 03 recommends** for provable Grīṣma readiness: fill the
real `MIDDAY` gap (§13) with cow/bird-flock entries biasing toward `shelter`/`rest`/`water` and
reduced `movementBias` — the concrete realization of "reduced midday activity, stronger shade/
water preference" the mission asks for, composing the existing rhythm mechanism, no new engine
capability, no new season.

---

## 35. Long-Horizon Compatibility

Every content item authored in this document (§6–§20) is definition/tendency data consumed by
already-generic engines with zero render coupling — compliant with Sprint 17's absence-evolution
requirement by construction, the same way every existing `vrindavan*Definition.ts` file already
is. **Dependency, marked PROVISIONAL:** Sprint 17's real, unfixed wake-chain crash-recovery gap
(the outermost "last fully-evolved tick" marker fix) is a prerequisite for trusting long-horizon
evolution over real visitor absence — per the sprint18-implementation-prep precedent, this is
still an open blocker as of this writing. Build 03 content does not itself need to change once
that fix lands; it only needs the fix to land before its own routines/adaptation are trusted
across a long absence.

---

## 36. Canonical-Event Boundary

**PROVISIONAL — RECONCILE AFTER BUILD 01 CLOSURE.** Sprint 18's `canonicalEvents` subsystem is the
only sanctioned path from an authorized canonical consequence to a bounded environmental/social
effect that living-content systems may react to. Its own current fixture ("Krishna lifting
Govardhan Hill") is explicitly Host-authored and unapproved (`provenance.canonDocIds: []`) — not a
real precedent to author content against. Build 01 Part 1's own handoff flags Phase P (how Part 2
will resolve canonical presence) as still open. Living-content systems (population, rhythms,
memory, adaptation) may only ever **consume** a bounded consequence signal from this subsystem —
they must never themselves decide a canonical event occurred. No Build 03 content in this
document assumes Phase P's resolution either way.

---

## 37. Visitor-Participation Boundary

Already, trivially satisfied by the real `InteractionIntent` union (§21) — `observe`/`witness`/
`follow`/`listen`/`pause`/`reflect` map directly onto `VisitLocationIntent`/
`BeginReflectionIntent`/`SelectEncounterIntent`. No `collect`/`farm`/`capture`/`score`/`level up`
capability exists anywhere in the population or embodiment contracts. Build 03 documents this as
an explicit **non-goal to preserve**, not a gap to fill — Living Vrindavan stays a living world,
not a quest economy, by the absence of any manipulation capability in the real code, not by a
policy statement alone.

---

## 38. Cultural / Ethical Content Boundary

Flagged for explicit approval before any Build 02 art-direction commitment:

| Item | Status | Care required |
|---|---|---|
| Cow (sacred animal in the Krishna tradition) | Host archetype real, authored neutrally | Visual representation needs cultural-sensitivity review, not generic-livestock treatment (§24) |
| Canonical characters (Krishna/Radha/Nanda/Yashoda) | None modeled anywhere | Must stay absent from the ordinary entity roster even if Canon eventually authorizes them (§12) |
| Ritual activity | None authorized | Do not add without new Canon |
| Religious iconography | None authorized | Do not add without new Canon |
| Kadamba tree (named via the location's own Approved Canon name) | Canopy archetype proposed (§6), name-only, no new species claim | StudioK art direction required for any visual asset (§24) |
| Music/mantra | None authorized; current motifs are neutral (`flowing-water`, `grove-ambience`) | Any future authored sound/music is a Canon-level decision, not an audio-taxonomy entry |
| Temple/shrine representation | None exists; Govardhan Path is a path, not a shrine | Do not introduce without new Canon |
| Mythic events | Only Sprint 18's unapproved fixture exists | Treat as pending, never as approved precedent (§36) |

---

## 39. Build 03 Implementation Sequence

1. Reconcile against Build 01 Part 2's closure (spatial IDs are already stable per Part 1; Phase
   P canonical-presence resolution and the visitor-participation flagship proof are the pieces
   still open).
2. Confirm initial content scope with Founder/Architecture: microhabitat vocabulary (§5),
   `grove-canopy`/`understory`/`grass-ground-cover` archetypes (§6), no new Canon fact required.
3. Author microhabitat definitions (§5) as a plain Host-owned label map.
4. Author the three new vegetation archetype definitions (§6), preserving `riverbank-vegetation`
   as-is.
5. No new animal archetype — reconcile/document the existing two-roster split (§8) as this
   document already does; author no third archetype.
6. No new resource tag — reuse the existing six (§14).
7. Author the `MIDDAY` rhythm-entry content delta for both Host archetypes (§13/§35) — the single
   concrete new routine content.
8. No new home-range mapping needed — existing `HomeRange`s already cover both groups (§16).
9. Author the one recommended emergent-encounter rule (`recent-watering-yamuna`, §17); no new
   adaptation rule (§18 — the existing five already suffice).
10. Author sensory-intent additions for `vrindavan-entry` and `govardhan-path` (§22–§23), reusing
    `STK-SPEC-004`'s existing shape.
11. Validate every new artifact against §28's rule set (module-load-time, fail loudly).
12. Ingest into Runtime through the existing per-domain `hostService.ts` pattern — no new
    ingestion mechanism.
13. Prove persistence/evolution through Build 01's own existing test conventions (continuity,
    patch differentiation, Vasanta-at-init, entity continuity) extended to the new content.
14. Hand off to Build 02 with the visual/audio taxonomies (§23–§25) and cultural-sensitivity
    flags (§38) attached.

This stays a short, bounded content pass — not a new long sprint program.

---

## 40. Acceptance Scenario

```text
Living Vrindavan initializes in Vasanta
    ↓
Yamuna's patch shows resourceAvailability=[water] and presentEntityIds=[cow herd]
(real, proven by Build 01 Part 1 — vegetationCondition/hydrologyCondition are the
 same world-global band on every patch, NOT a per-patch fact — see §7's honest note)
    ↓
The cow herd (avatark-population-cow-herd) and the bird flock
(avatark-population-bird-flock) exist as the two real persistent groups
    ↓
MORNING routine places the herd grazing/drinking at Yamuna and the flock
socializing at Govardhan Path's gathering affordance (real, proven)
    ↓
World advances toward Grīṣma
    ↓
vegetationActivityBand drops to moderate, animalActivityBand drops to low
(real, causal, zero new code) — yamuna-flowering-reflection and
kadamba-grove-ambient-presence both naturally stop firing (real, causal)
    ↓
With the recommended MIDDAY content delta (§13/§35) authored, midday
occupancy visibly shifts toward shelter/rest/water-preferring locations
    ↓
Visitor observes the living change at Yamuna or Kadamba Grove
    ↓
Visitor leaves
    ↓
World advances several periods (subject to Sprint 17's crash-recovery fix
landing — PROVISIONAL, §35)
    ↓
Population memory (kadamba-grove's two real emergent rules, plus the
recommended Yamuna addition) and adaptation (rules A-E) persist
    ↓
Visitor returns
    ↓
Same populations (avatark-population-cow-1/-2, avatark-population-bird-flock-1/-2)
continue with legitimately changed tendency, never a fabricated narrative event
```

Everything in this scenario up through Vasanta initial state, MORNING routing, and Grīṣma's
causal rule-eligibility drop is **already real and proven** (Build 01 Part 1). The `MIDDAY`
content delta and the Yamuna emergent rule are **Build 03 recommendations, not yet implemented**.
The long-absence advance step is **PROVISIONAL** pending Sprint 17's crash-recovery fix.

---

## 41. Dependencies on Build 01 / Build 02

| Dependency | State | Effect on this document |
|---|---|---|
| Build 01 Part 1 (spatial/population/ecology ground truth) | **CLOSED**, verified (`d313eb3`) | Fully reconciled — this document's ground truth section cites it directly |
| Build 01 Part 2 (long-horizon, canonical presence Phase P, visitor-participation flagship, renderer-neutral embodiment) | **IN PROGRESS**, not read beyond Part 1's own handoff notes | §36 (canonical-event boundary) and the long-absence step of §40 are PROVISIONAL until Part 2 closes |
| Sprint 17 crash-recovery fix | Identified, real, **not yet landed** per available records | §35/§40's long-horizon step is PROVISIONAL until it lands |
| Build 02 Phase 0 (Visual Embodiment & Unreal Integration) | **Not yet available to read** | §24–§26 (visual taxonomy, marketplace matrix, artifact format) are category-level only; no asset assumption is made anywhere in this document |

---

## 42. Build 03 STOP Gates

Restated against concrete findings from this review, not abstractly:

- **Required population implies unauthorized Canon** → ambient human life (§12): STOP, documented
  as a gap, no villager archetype authored.
- **Build 01 spatial IDs are unstable** → not triggered; Build 01 Part 1 confirms the four
  LocalPlace IDs and the full spatial hierarchy are stable and closed.
- **Required local place is not approved** → not triggered; every place referenced in this
  document is one of the four real, Approved locations.
- **Protected character would need ordinary entity simulation** → not triggered today (no
  protected character exists in the roster); standing rule recorded in §12 for if one ever is
  authorized.
- **Ecological behavior needs a new runtime engine** → per-Patch environmental simulation: STOP,
  resolved by keeping microhabitats presentation-only (§5), never a new simulated tier.
- **Content schema duplicates existing runtime contracts** → avoided by explicitly declining a
  new population/routine/resource JSON family (§26) and a new microhabitat runtime package (§5).
- **Cultural specificity requires human authoring** → Kadamba canopy and cow visual assets, any
  music/mantra content: STOP, flagged for StudioK art direction / Founder review (§38), not
  authored here.
- **Build 02 requires asset assumptions not yet approved** → §24–§26 stay category-level only;
  no specific asset, mesh, or Unreal identifier is named anywhere in this document.

---

LIVING VRINDAVAN BUILD 03 PHASE 0 — LIVING CONTENT & POPULATION AUTHORING ARCHITECTURE READY — WAITING FOR BUILD 01 CLOSURE
