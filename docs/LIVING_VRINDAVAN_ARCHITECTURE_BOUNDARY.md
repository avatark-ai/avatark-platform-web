# Living Vrindavan: Architecture Boundary

Sprint 5's vertical slice, proving the canonical pipeline:

```text
StudioK Canon (meaning)
      |
StudioK Specification (machine-interpretable contract)
      |
Portable World Artifact (versioned, renderer-neutral data)
      |
AvatarK Host Adapter (StudioK vocabulary -> Runtime Kernel vocabulary)
      |
Living World Runtime (generic execution)
      |
Context Runtime / Experience Registry / Timeline
      |
Consumer Experience (Enter, Navigate, Reflect, Persist, Resume)
```

The critical rule this document exists to keep visible: **StudioK authors
worlds. AvatarK runs worlds.** Neither responsibility collapses into the
other.

## StudioK responsibilities

Owns *meaning* — everything a Living World means, not how it runs.

- **Canon** (`studiok-canon`): franchise truth, authored by the
  architecture team (or, this sprint, Founder/Architecture-supplied
  source material carried through the same governance lifecycle) — world
  identity, purpose, canonical locations, the world graph, canonical
  experience principles, human questions, and general Living Laws
  (privacy, renderer-independence). Draft → Proposed → Approved,
  versioned via `canon-manifest.json`.
- **Specifications** (`studiok-specifications`): the machine-interpretable
  technical contract derived from Approved Canon — a reusable JSON Schema
  (`STK-SPEC-001`, world-agnostic) and a conforming per-world portable
  artifact (`STK-SPEC-002` for Living Vrindavan). A spec cannot reach
  Approved without Approved Canon backing it.
- **Content metadata & asset references**: the artifact's `principles[]`
  (Canon IDs, not duplicated content) and `provenance` block are the only
  StudioK-side traceability mechanism this slice needs — no asset
  pipeline exists yet, so no asset-reference field is populated.

## AvatarK responsibilities

Owns *execution* — identity, persistence, and every consumer-facing
surface, with zero authored-content knowledge of its own.

- **Identity / authentication**: unchanged from the existing Runtime
  Foundation (Supabase-backed for the real routes; dev singletons for
  local/Playwright).
- **Runtime execution**: `@avatark/living-world-runtime` (a true leaf,
  franchise-agnostic) executes whatever `WorldDefinition` the Host
  supplies. It has no knowledge Living Vrindavan, Krishna, or any other
  world's name exists.
- **Host adapter** (`lib/livingWorldRuntime/vrindavanDefinition.ts`):
  the one and only place StudioK's renderer-neutral graph format is
  translated into the Runtime Kernel's own vocabulary (`WorldLocation`,
  `requiresLocationIds`, `WorldActivity.reflectionRef`). This is Host
  logic (`lib/`), never inside a runtime package.
- **Persistence**: in-memory per Sprint 4's own documented limitation
  (no Postgres repository exists yet for Living World or the Registry);
  user-scoped regardless.
- **Current Context**: `currentLivingWorldId` and `currentLocationId`
  sync together on every world entry and location transition
  (`lib/runtimeKernel/orchestrator.ts`).
- **Experience Registry**: append-only event log; this slice adds no new
  event types beyond what the Registry's existing conventions already
  named (`world.entered`, `world.left`, `world.location_visited`,
  `reflection.created`).
- **Timeline**: unchanged — a pure projection over the Registry.
- **Consumer surfaces**: the Living Worlds card (existing, generic,
  unchanged code) and the new `LivingWorldDetailView` component
  (`components/account/LivingWorldDetailView.tsx`) — generic over any
  world id, rendering only what the API returns (current location, legal
  next locations derived server-side from the authored graph, an authored
  reflection prompt when present). No location name or graph shape is
  hardcoded in this component.

## Future Unreal / StudioK Platform responsibilities

Not built this sprint. When it exists, it becomes *another renderer* of
the same `world-definition.schema.json`-shaped artifact — visualization,
spatial rendering, environment simulation, PCG, world embodiment,
high-fidelity interaction. The artifact's own Renderer Principle
(`STK-CAN-005`) exists specifically so this slots in without a schema
change: **canon ≠ renderer**.

## GameK responsibilities — future

Challenges, game mechanics, progression experiences layered on top of a
Living World's location graph. Not implemented; the artifact's
`principles[]`/activity model has room for a future `practiceRef`-style
`challengeRef` without a schema-breaking change, but none exists yet.

## PrometheusK responsibilities — future

Practices, deeper reflection, transformation protocols. This sprint's
"reflection point" is deliberately shallow — it proves the *affordance*
(StudioK authors a prompt, AvatarK exposes it, an event is recorded) with
no persisted reflection content and no protocol logic. A real
PrometheusK integration would consume the same `reflectionRef` pointer
this slice already emits (`{ reflectionId, source: "studiok-canon" }`) --
that pointer format doesn't need to change for PrometheusK to become its
real resolver.

## StreamK responsibilities — future

Episode/watch entry, narrative release entry points into a Living World.
Not implemented; no hook exists yet.

## What this boundary already proves

The same architecture — Host adapter, generic `WorldDefinition`, Context
sync, Registry events, Timeline projection, the generic
`LivingWorldDetailView` component — could accept Living Forest, Living
Stillness, Living Symphony, or Living Forge tomorrow, each with its own
StudioK-authored artifact, **without changing the Runtime Kernel, the
Host adapter's shape, or any consumer component.** Only
`lib/livingWorldRuntime/singleton.ts`'s one-line definitions merge and a
new vendored artifact file would be needed per additional world.
