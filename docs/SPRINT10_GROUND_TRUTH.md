# Sprint 10, Phase 0 — Ground Truth / Ownership Report

Branch `feature/sprint10-living-population`, off `feature/sprint9-persistent-world`
@ `6a01161`. Written before any Sprint 10 code.

## Ownership map (the four state domains, unchanged)

1. **Shared World State** — `SharedWorldState` (Sprint 7, untouched). Sprint
   10 reads it as a causal input; never writes to it.
2. **Persistent Living/Entity State** — `LivingEntityState` (Sprint 7,
   untouched type). Sprint 10's population/behavior state is a NEW,
   additive extension living in this domain, keyed by `entityId`, never
   replacing or restructuring the existing type. See "roster split" below.
3. **Visitor Meaningful-Memory State** — untouched. Population never reads
   or writes it; a visitor's presence/absence has zero effect on
   authoritative population truth (Phase 13's own requirement).
4. **Protected Canonical Narrative State** — untouched, still read-only.
   `resolveAvailableEncounters` (Sprint 7, unmodified) remains the only
   gate; population only supplies *presence*, never narrative content.

## What already exists that Sprint 10 must not re-invent or fork

- **`advanceWorldSimulation`** (Sprint 7) is still the one causal engine
  for season/weather/hydrology/ecology and for the *existing* two
  vendored entity archetypes' ecological-band-driven lifecycle stepping
  (`riverbank-vegetation`, `ambient-bird-flock`). Sprint 10 calls it
  unmodified, tick-by-tick, exactly the way Sprint 9's own
  `computeDeterministicCatchUp` already does — it does not rewrite or
  fork it.
- **`resolveEntityPresentation`** (Sprint 8) already reads
  `entity.lifecyclePhase` as both `activityHint` and `animationSemantic`.
  This means: if Sprint 10 writes a population entity's coarse activity
  state directly into its own `LivingEntityState.lifecyclePhase` field
  (Phase 10's own suggested vocabulary — DORMANT/RESTING/ACTIVE/MOVING),
  the *existing* embodiment resolver picks it up with zero changes. Only
  the *finer* semantics Phase 15 asks for (specific behavior, movement
  intent, group id) are genuinely new fields.
- **The StudioK-vendored world graph is real**: `livingVrindavan.world.json`
  has an actual `connections[]` array (`vrindavan-entry→yamuna`,
  `yamuna→kadamba-grove`, `yamuna→govardhan-path`) — a small tree, not a
  placeholder. Sprint 5's own Host conversion
  (`vrindavanDefinition.ts`) treats it as *directed* (parent→child,
  visitor-unlock semantics). Physical entity movement has no reason to
  be one-directional the way visitor progression does, so Sprint 10
  treats the *same* connection list as an *undirected* adjacency graph
  for entity movement legality — a different Host-layer interpretation
  of already-existing StudioK data, inventing no new location or edge.

## The roster-split decision (the central Phase 0 judgment call)

Two archetypes already exist in the StudioK-Approved, vendored systems
artifact: `riverbank-vegetation` (@ yamuna) and `ambient-bird-flock` (@
kadamba-grove) — both currently driven end-to-end by Sprint 7's generic
ecological-band lifecycle rule (`advanceEntityLifecycle`), exercised by
Sprint 7/8/9's own passing test suite and the live Host wiring in
`lib/livingSystems/singleton.ts`.

Running these same two entities through a SECOND mechanism (Sprint 10's
needs/rhythm/behavior engine) would mean two systems both trying to own
`lifecyclePhase` for the same entity — a genuine "second world-state
authority" for that entity, which the mission explicitly forbids. So:

- **The existing two vendored entities are left 100% untouched** — same
  archetypes, same seeding, same `advanceEntityLifecycle` path, same
  tests, unmodified. Invariant #15 (existing Sprint 5-9 behavior remains
  compatible) is satisfied by *not touching* rather than by re-deriving
  the same outcome through new code.
- **Sprint 10's population roster is an entirely separate, additive set
  of entities** with their own archetype ids, defined at the Host layer
  (`lib/livingPopulation/`), never inside the StudioK-vendored JSON.
  Two neutral, non-narrative, capability-tagged archetypes are added —
  a bird-flock-capable one (@ kadamba-grove) and a cattle
  herd-capable one (@ yamuna) — matching the exact vocabulary the
  Sprint 10 mission brief itself names as an example ("cow, calf,
  bird... where supported"), and satisfying Phase 2's "canon-safe/
  reference entities needed to prove the architecture." No name, no
  theology, no dialogue, no story attaches to either — they are
  capability bundles (`can_move`, `can_graze`, `can_drink`, `can_rest`,
  `can_group`/`can_flock`), nothing else. **This is a judgment call, not
  a StudioK-authored addition** — it is intentionally kept out of the
  vendored artifact precisely so it is easy to remove, relocate into a
  real STK-SPEC, or reject outright without touching canon if a reviewer
  disagrees with this specific choice.
- Resource tagging per location (which locations count as "water" /
  "vegetation" / "shelter" / "gathering" for population perception) is
  likewise a Host-layer, non-canonical, systems-config derivation from
  the *already-Approved* location `role`/`purpose` text (Yamuna → water;
  Kadamba Grove → vegetation/shelter; Govardhan Path → gathering) — not
  new narrative content, but flagged the same way for the same reason.

## Alternate-world fixture already exists

`packages/living-systems-runtime/src/otherWorldGrammar.test.ts` and
`packages/world-persistence-runtime/src/livingForestPortability.test.ts`
already establish a fictional `"living-forest-fixture"` world with a
`deer-herd` archetype. Sprint 10 reuses this exact fixture for Phase 19's
herd-dynamics proof, rather than inventing new fictional content.

## No conflict found

No genuine architectural or canon conflict blocks Sprint 10. Proceeding.
