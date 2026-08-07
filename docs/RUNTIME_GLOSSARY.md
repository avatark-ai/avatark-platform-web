# Runtime Glossary — Episode Model & Naming Cleanup

Source of truth: [PLATFORM_INTEGRATION_SPRINT_1.md](./PLATFORM_INTEGRATION_SPRINT_1.md)'s
duplicate-concept audit. This document resolves *terminology*, not *code* — every recommendation
here is something a future sprint could adopt without changing behavior. Nothing in this document
has been applied. No concept is collapsed; per this sprint's own instruction, genuinely different
things stay genuinely different, documented as such.

---

## Part 1 — The Episode Model

### Correcting an assumption first

The mission brief for this phase names four Episode concepts: Narrative, Experience, World, and
Context. Checking each against the actual, verified source (not assumption):

| Named concept | Exists as a real type? | Verified against |
|---|---|---|
| Narrative Episode | ✅ Yes | `narrative-runtime/src/types.ts`: `Episode { id, title, entrySceneId, scenes: Scene[] }` |
| Experience Episode | ✅ Yes | `experience-runtime/src/types.ts`: `EpisodeDefinition extends JourneyNode { reflectionIds?: string[] }` |
| Context Episode | ✅ Yes, but not a *type* — an opaque reference | `context-runtime/src/types.ts`: `currentEpisodeId: string`, one of 13 context axes, no `Episode` interface backs it |
| **World Episode** | **❌ Does not exist** | `living-world-runtime/src/types.ts` has no `Episode` anywhere — its structure is `WorldDefinition { locations: WorldLocation[], activities: WorldActivity[] }`, no episode-shaped concept at any level |

**This document will not invent a fourth Episode type to match the brief's framing.** The real
inventory is two typed definitions, one opaque reference, and one confirmed non-existence:

### The two real Episode definitions, side by side

| | Narrative Episode | Experience Episode |
|---|---|---|
| Full path | `narrative-runtime`'s `Episode` | `experience-runtime`'s `EpisodeDefinition` |
| Shape | `{ id, title, entrySceneId, scenes: Scene[] }` | `{ id, title, prerequisites: string[], reflectionIds?: string[] }` |
| Structure | A **fixed, authored, sequential container** — scenes are traversed in the order the author wrote them, via `entrySceneId` and each scene's own beat graph | A **prerequisite-gated node in a DAG** — unlocked by *other* nodes being complete, no inherent internal sequence of its own |
| Who authors it | StudioK (per `narrative-runtime`'s own package description: "StudioK authors the definitions this package executes") | Whichever host/product defines a `JourneyDefinition` — no dedicated authoring product named |
| Lifecycle unit | One step in a literary Season; completing it means "the story reached the end of this container" | One unlockable chunk of a progression graph; completing it means "this prerequisite is now satisfied for whatever depends on it" |
| Internal children | `Scene[]` (which contain `Beat[]`) | none — it's a leaf node with `reflectionIds` pointing *out* to separate `ReflectionDefinition`s |

**Why both need to exist, unchanged:** these aren't two names for one idea that drifted apart —
they answer different questions. Narrative Episode answers "where is this user in the authored
story." Experience Episode answers "which prerequisite has this user satisfied." A single
`Season > Episode > Scene > Beat` narrative could, in principle, sit *inside* one Experience Episode
node (a Journey's episode could contain — by reference, not by import — an entire narrative), or a
Journey's episode could have no narrative at all (a pure practice/milestone gate). Collapsing them
would force every Journey episode to have scenes and every narrative episode to have prerequisites,
which is not true of either today and not something either mission asked to change.

### What CAN share a contract without collapsing anything

The **opaque reference** shape — not the definitions themselves. Per
[RUNTIME_CONTRACTS.md](./RUNTIME_CONTRACTS.md) §2, `context-runtime`'s bare `currentEpisodeId:
string` (and any future package that needs to point at "an episode, from somewhere") can be typed
as `Reference<"episode">` (alias: `EpisodeRef`) instead of a bare, unenforced string — with an
explicit, documented ambiguity: **a value in that field could be a `narrative-runtime` Episode id
or an `experience-runtime` Episode id, and nothing in the reference shape itself disambiguates
which.** That ambiguity already exists today (the field is an unenforced string); typing it as
`EpisodeRef` doesn't remove the ambiguity, it just makes it a documented, structural fact instead
of a silent one. Resolving *which* Episode a given `currentEpisodeId` means requires a second field
or a naming convention (e.g. `currentNarrativeEpisodeId` vs `currentExperienceEpisodeId`) — a real
design decision, correctly out of scope for this sprint, flagged here for Sprint 3.

### Scene — the same pattern, one level down

`narrative-runtime`'s `Scene` (literary: `{id, title, entryBeatId, beats}`) and
`context-runtime`'s `currentSceneId` (opaque axis) follow the identical shape as Episode, minus the
second collision — there is no "Experience Scene" or "World Scene." Lower risk. Same
recommendation: type `currentSceneId` as `Reference<"scene">` (`SceneRef`) when this is next
touched, no other action needed.

---

## Part 2 — Canonical Vocabulary

For each term, this table states: what it canonically means going forward, what (if anything) is
recommended to change, and — critically — the **effort/risk tier** of that change, since "recommend
a rename" and "this is safe to do today" are different claims.

| Term | Canonical meaning | Recommendation | Risk tier |
|---|---|---|---|
| **Journey** | Reserved exclusively for `@avatark/journey`'s pre-existing invitation → arena onboarding funnel (`JourneyStepId`) — its original meaning, already live in shipped routes (`app/witness/`, `app/enter/`). | `experience-runtime`'s internal vocabulary (`JourneyDefinition`/`JourneyRuntime`/`JourneyState`) should rename to match the *package's own name* (`ExperienceDefinition`/`ExperienceRuntime`/`ExperienceState`) — the package is already called `experience-runtime`; its types just haven't caught up. This is the root cause of the "three Journeys" confusion, not three independently necessary uses of the word. | Medium — type rename only, no behavior change, but touches every file in the package plus `lib/experienceRuntime/*` and `app/api/account/journey/route.ts`'s imports. Sprint 3+, not this sprint. |
| **Experience** | The progression-engine domain (`experience-runtime`) and the per-event log subject (`experience-registry`'s `ExperienceEvent`). | Once the Journey→Experience rename above happens, both packages' vocabulary will actually match their names. No new action beyond that. | Depends on Journey rename above |
| **Narrative** | StudioK-authored literary structure (`Season > Episode > Scene > Beat`), executed by `narrative-runtime`. | No collision. Keep as-is. | None |
| **Scene** | `narrative-runtime`'s literary Scene only. `context-runtime`'s `currentSceneId` is a *reference to* a Scene, not a second Scene concept. | Type `currentSceneId` as `SceneRef` (§Part 1). | Low |
| **Beat** | The smallest narrative unit (`narration`/`choice`/`trigger`), `narrative-runtime` only. | No collision found. Keep as-is. | None |
| **Practice** | No dedicated engine exists anywhere yet. `experience-runtime`'s `PracticeDefinition` is the only real definition today. | Treat `experience-runtime`'s `PracticeDefinition` as canonical until/unless a dedicated practice engine is built; `living-world-runtime`'s `WorldPracticeRef` and `narrative-runtime`'s `PracticeRef` both become `Reference<"practice">` (`PracticeRef` per RUNTIME_CONTRACTS.md). | Low — both are already opaque refs with no behavior; retyping doesn't change what they point at. |
| **Reflection** | Same situation as Practice. `experience-runtime`'s `ReflectionDefinition` is the only real definition. | Same treatment: `WorldReflectionRef`/narrative's `ReflectionRef` → `Reference<"reflection">`. | Low |
| **Challenge** | A `PracticeDefinition` with `kind: "challenge"` in `experience-runtime` — a variant, not a separate type. Also appears as `challenge.started`/`challenge.completed` event-type strings in `experience-registry`. | No collision, no action needed. | None |
| **Milestone** | `experience-runtime`'s `MilestoneDefinition`/`MilestoneCriteria` only. | No collision, no action needed. | None |
| **Living World** | The *real* engine is `living-world-runtime`'s `WorldDefinition`/`WorldRuntime`. `@avatark/account`'s `LivingWorld` UI contract is what it should eventually feed. | `experience-runtime`'s `LivingWorldDefinition` (an alias of its generic `JourneyNode` — just `{id, title, prerequisites}`, no locations, no activities) is structurally a *gate*, not a world. Recommend renaming it in that package (e.g. `WorldGateDefinition`) so it stops implying parity with the real engine it shares a name with but not a shape. | Medium — type rename inside `experience-runtime` only; no consumer outside the package references this type today per Sprint 1's audit, so blast radius is contained to one package. |
| **Context** | `context-runtime`'s 13-axis `ContextSnapshot`/`ContextFields` model. | `@avatark/account`'s `CurrentContextState` stays as the documented **legacy UI projection** (live, has real consumers, not worth the rename risk this sprint). `narrative-runtime`'s `NarrativeContextRef.key: string` should retype against `context-runtime`'s `ContextFieldKey` (already recommended in Sprint 1). | Low for the retype; not recommending any change to `CurrentContextState` itself. |
| **Registry** | `experience-registry`'s `ExperienceEvent` log. | `@avatark/timeline` (pre-existing, contract-only, never implemented) should carry a doc-comment marking it superseded-by-in-practice by `experience-registry`, pointing readers there. Not a code change — a one-line comment addition, and only once someone actually reviews `timeline`'s file, not urgent for this sprint. | Very low (a comment) whenever it happens; the *decision* of whether to formally deprecate `timeline` is a separate, larger call outside this sprint's scope. |

### What this table deliberately does not do

It does not rename anything. It does not touch `packages/journey` (explicitly out of scope per
this sprint's own "leave untouched" instruction). It does not resolve the `CurrentContextState`
question definitively — that field has real, live consumers and a wrong call there has UI-visible
consequences, which is exactly the kind of decision this sprint's rules reserve for a human, not an
automated pass.
