# AvatarK Architecture Decision Log — V1

**Status:** governance record. No redesign, no renames, no new concepts. Every decision below is
drawn from the ratified corpus indexed in `docs/ARCHITECTURE_INDEX_V1.md`; where this review found
the corpus itself is inconsistent about a decision, that's recorded as part of the decision, not
smoothed over — a decision log's job is to capture what was actually decided, including where two
documents don't fully agree.

---

### Decision: AvatarK is identity, not a product

- **Reason:** every AvatarK product needs one shared account, org, and permission layer; that
  layer can't itself be "a product" competing for the same slot as GameK/PrometheusK/etc. without
  becoming circular (who administers the administrator?).
- **Tradeoffs:** makes AvatarK simultaneously the Level-0 root *and* the thing every Level-3
  product's admin surface ultimately reports to — a dual role that's coherent but must be held
  deliberately, not accidentally.
- **Alternatives rejected:** AvatarK as one product among equals (rejected — circular ownership,
  no clear home for cross-product identity); a separate, un-branded identity service with no
  consumer surface at all (rejected — Track A/B's real, shipped work is a consumer-facing account/
  admin experience, not just an invisible service).
- **Implementation impact — real inconsistency found, not resolved here:** `packages/product-
  registry`'s `PRODUCT_REGISTRY` array (built and tested, `PRODUCT_REGISTRY.md`) currently
  **includes an `avatark` entry at Level 3** (`category: 'platform'`), added at the time for a
  stated reason — "every product registers through the Platform registry is literally true rather
  than an implicit exception." That reasoning is in real tension with "AvatarK is identity, not a
  product." This freeze pass surfaces the conflict rather than picking a side: either the
  `avatark` registry entry is a deliberate, documented exception (the platform's own account
  surface genuinely has Level-3-like properties — a domain, an entry point), or it should be
  removed from `PRODUCT_REGISTRY` and treated purely as Level 0. Flagged for a future decision,
  not made here (making it would be a schema change, out of this pass's scope).

---

### Decision: Multi-door ecosystem

- **Reason:** a user should be able to arrive at the same underlying practice/game/competition
  through whichever door matches their actual want (a Franchise, an Activity, a direct product
  link) rather than one canonical path.
- **Tradeoffs:** more entry points to keep honest and in sync (visibility/status rules must be
  enforced identically no matter which door was used) versus a single funnel, which is simpler to
  reason about but forces every user through the same onboarding regardless of intent.
- **Alternatives rejected:** single-funnel onboarding (rejected — contradicts the Section 1
  observation in `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` that users don't wake up wanting a
  specific product); a fully separate landing experience per product (rejected — reintroduces
  product silos this whole series exists to avoid).
- **Implementation impact:** zero doors beyond today's single hardcoded landing flow are actually
  built — see the Implementation Readiness table's Navigation column (`ARCHITECTURE_INDEX_V1.md`
  Section 4), which is NOT STARTED for every product.

---

### Decision: Five Activities (Explore, Practice, Together, Watch, Create) — not Four

- **Reason:** these five map cleanly onto the products that already exist (GameK, PrometheusK,
  ArenaK, StreamK/CinemaK, StudioK) and onto the verbs users actually reach for.
- **Tradeoffs:** a small, fixed verb set is easy to reason about and market, at the cost of forcing
  genuinely different wants (co-presence vs. scored competition) into one bucket — see the next
  entry.
- **Alternatives rejected:** a sixth Activity, **Compete**, split out from Together — proposed in
  `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` Section 4.3 specifically because ArenaK's
  challenge/league/ranking nature doesn't obviously fit generic "Together." **Not adopted** — every
  ratified document in this corpus, including this brief's own example diagrams, uses five.
- **Implementation impact:** none directly (Activities aren't schema fields today). **This entry
  exists to flag a real discrepancy, not to resolve one:** this freeze brief's own example list
  named "Four Activities" as a ratified decision, without listing which four. Nothing in the
  reviewed corpus supports four — every document, including three of this session's own prior
  documents and this brief's own worked examples, consistently uses five. Renaming/recounting
  Activities is explicitly out of scope for this pass ("do not rename Activities"), so this is
  logged as an open discrepancy for whoever next touches Activity naming to resolve deliberately,
  rather than silently adopted or silently ignored.

---

### Decision: Products are universal (no Franchise owns a Product)

- **Reason:** if any Franchise could claim exclusive use of a Product, adding a new Franchise
  later would require either a new Product (defeating the whole "registration only" scaling goal)
  or fighting over an existing one.
- **Tradeoffs:** no Product can be deeply specialized for one Franchise's exact needs — it has to
  stay general enough for all of them, which is more engineering discipline than a bespoke,
  single-Franchise build would need.
- **Alternatives rejected:** per-Franchise product forks (rejected outright — this is the literal
  re-implementation rule this entire ecosystem has enforced since RC1's `INVITATION_MIGRATION.md`,
  generalized from "don't rebuild PrometheusK's runtime" to "no Product is any Franchise's
  exclusive implementation").
- **Implementation impact:** confirmed by construction — `packages/product-registry`'s schema has
  no `franchise`/`ownedBy` field, and `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` explicitly recommends
  it never gain one.

---

### Decision: Franchise owns content; Products own implementation

- **Reason:** cleanly separates "why is this user here" (Franchise) from "how does the thing
  actually run" (Product) — the core rule `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` Section 1
  formalizes.
- **Tradeoffs:** requires every future Franchise designer to think in terms of "which existing
  Activities/Products does my content route through" rather than "what do I need to build" — a
  real mindset shift from product-first to content-first planning.
- **Alternatives rejected:** Franchise-as-product (a Franchise ships its own bespoke app) —
  rejected for the same reason as the entry above; Product-as-content-owner (Products decide what
  content exists) — rejected because it inverts the actual want-vs-implementation relationship
  Section 1 of this whole series is built on.
- **Implementation impact:** none yet — no content-layer data model (which Experiences exist,
  tagged by Franchise/Activity) has been built. This is named as future, Registry-adjacent-but-
  separate work in `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` Section 6.

---

### Decision: Story → Practice → Challenge → Competition → Live event → StreamK → CinemaK → Creator ecosystem maturity

- **Reason:** gives every Franchise (persona-type or Theme-type) one honest, ordered way to
  describe how built-out it is, and stops any Franchise's launch from claiming more maturity than
  it has.
- **Tradeoffs:** a strict ladder order means even a Franchise with abundant Watch-ready content
  (e.g. licensed footage) is still expected to show Practice/Challenge progress first — a
  deliberate constraint, not an oversight, to keep early rungs (which prove real audience demand)
  from being skipped in favor of expensive late rungs (CinemaK) that are hard to walk back from.
- **Alternatives rejected:** letting each Franchise define its own bespoke maturity path (rejected
  — no cross-Franchise comparability, and no shared vocabulary for "how far along is X" that a
  roadmap or dashboard could use); a numeric maturity score (rejected — a single number hides which
  specific rung is missing, the opposite of the honesty discipline this whole corpus applies
  elsewhere).
- **Implementation impact:** purely an editorial-planning construct today (`AVATARK_ECOSYSTEM_
  ROADMAP_V1.md`), not tracked in the Registry schema — no `maturityStage` field exists or is
  proposed.

---

### Decision: Registry is routing substrate, not a sequential layer

- **Reason:** the Registry (`packages/product-registry`) is consulted by every level above it —
  World/Franchise, Activity, Product — to resolve where a user goes next; it isn't a place a user
  "arrives at" after choosing a Product, which the original stack diagram implied by drawing it as
  a fifth sequential floor.
- **Tradeoffs:** none functionally — this is a correction to how the model is *drawn*, not a
  change to what exists. The real tradeoff is documentation discipline: everyone reasoning about
  this stack has to remember Registry is a rail underneath, not a floor.
- **Alternatives rejected:** literally treating Registry as Level 4 in sequence, as first proposed
  — corrected in `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` Section 4.2/6.1 as a category error,
  not a viable alternative to weigh against.
- **Implementation impact:** none — this is purely a conceptual correction; `packages/product-
  registry`'s actual code is unaffected either way.

---

### Decision: GameK is Explore

- **Reason:** GameK's existing ownership (world/game state, per `PLATFORM_FOUNDATION.md`'s
  original domain sketch and `PRODUCT_REGISTRY.md`'s `category: 'game'`) is naturally interactive/
  exploratory, matching the Explore Activity's shape.
- **Tradeoffs:** GameK must generalize its interaction model across very different Franchise
  content (mythic exploration, deduction puzzles, physics thought-experiments) rather than staying
  a single genre — the explicit stress-test mechanism from `AVATARK_ECOSYSTEM_ROADMAP_V1.md`
  Section 1.
- **Alternatives rejected:** a dedicated Explore product per Franchise (rejected — re-implementation
  rule); folding Explore into Watch as passive-vs-interactive variants of the same thing (rejected
  — interactivity is a meaningfully different want from consumption, not a variant of it).
- **Implementation impact:** none new — GameK's real, standalone codebase (`gamek-web`) is
  unaffected; this decision is about what it's *called* in the ecosystem map, not a rebuild.

---

### Decision: PrometheusK is Practice

- **Reason:** PrometheusK's real, shipped identity (reflection, guided practice, Living Echo) is
  the Practice Activity's canonical implementation.
- **Tradeoffs:** the single biggest tradeoff in this whole corpus — PrometheusK's name collides
  with the Prometheus Franchise, creating a real, named risk (`FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`
  Section 2.2) that users/engineers will wrongly assume ownership runs the other way. Accepted, not
  eliminated — mitigated by disambiguation discipline, not a rename (explicitly out of scope, both
  in that document and in this one).
- **Alternatives rejected:** renaming PrometheusK to remove the collision (rejected in the prompt
  that produced `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`, and reaffirmed as out of scope by this
  brief's own "do not rename Products"); scoping PrometheusK to serve only the Prometheus Franchise
  and building a second, generic practice engine for everyone else (rejected — directly
  contradicts "Products are universal," and would double the maintenance burden for no real gain).
- **Implementation impact:** none new — same as GameK above, a mapping decision, not a rebuild.
  The real, still-open action item is the disambiguation discipline itself (documentation,
  onboarding copy, internal conversation), not code.

---

### Decision: ArenaK is Together

- **Reason:** matches this brief's own worked examples (Prometheus/Krishna diagrams in
  `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` Section 3, inherited directly from this session's prompts)
  and ArenaK's existing ownership (challenges, leagues, rankings).
- **Tradeoffs:** collapses two different wants — co-presence/community and scored competition —
  into one Activity label, which is the same tension already named under "Five Activities" above.
- **Alternatives rejected:** a distinct **Compete** Activity for ArenaK specifically, proposed in
  `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` Section 4.3 — **considered, not adopted.** This
  freeze pass records the corpus's actual, current position (Together, covering both) rather than
  quietly re-opening it, per this brief's explicit "do not rename Activities."
- **Implementation impact:** none new.

---

### Decision: StreamK is Watch

- **Reason:** StreamK's ownership (live/on-demand streaming) is the direct implementation of the
  Watch Activity for ongoing, channel-style content.
- **Tradeoffs:** shares the Watch Activity with CinemaK (see next entry), meaning "Watch" is
  legitimately one-to-many with Products, not one-to-one — named explicitly in
  `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` Section 4.3 rather than left implicit.
- **Alternatives rejected:** a single combined Stream/Cinema product (rejected — no stated reason
  in this corpus to merge two already-separate, already-owned products; doing so now would itself
  be the redesign this pass is explicitly not permitted to do).
- **Implementation impact:** none new.

---

### Decision: StudioK is Create

- **Reason:** StudioK's ownership (creation tools) is the direct implementation of the Create
  Activity.
- **Tradeoffs:** Create is, by every worked example in `AVATARK_ECOSYSTEM_ROADMAP_V1.md`, the
  *last* rung most Franchises reach (the Creator-ecosystem stage) — meaning StudioK is expected to
  stay the least-used Product for the longest time, by design, not neglect. That's a real resourcing
  implication worth naming: StudioK's own roadmap should not be judged by the same early-traction
  bar as GameK or PrometheusK.
- **Alternatives rejected:** none recorded — no document in this corpus proposed an alternative
  Create-Activity owner.
- **Implementation impact:** none new. Confirmed as genuinely the least-built-out Product in the
  Implementation Readiness table (`ARCHITECTURE_INDEX_V1.md` Section 4) — consistent with, not
  contradicting, this decision's own stated maturity expectation.

---

### Decision: Atlas is substrate, not an Activity destination

- **Reason:** Atlas's ownership ("institutional knowledge") isn't something a user *does* — it's
  what other Activities' content draws on for grounding, per `AVATARK_WORLD_ACTIVITY_PRODUCT_
  MODEL_V1.md` Section 4.4's original critique of forcing Atlas into the same Activity-mapped row
  as everything else.
- **Tradeoffs:** Atlas has no consumer-facing entry point of its own, which is unusual among the
  8 products — it must be judged by a different rubric (breadth/accuracy of what it backs) than
  every other Product (audience reach, ladder progress).
- **Alternatives rejected:** giving Atlas its own Activity/destination (e.g. a "Reference" or
  "Learn" Activity) — considered implicitly when the sparse-matrix problem was first raised, not
  adopted, since it would be a sixth+ Activity and this pass (like the World/Activity document
  before it) doesn't have a confirmed real destination-shaped use case for Atlas to justify one.
- **Implementation impact:** none new. Reflected in the Implementation Readiness table as UX/
  Navigation "NOT APPLICABLE" rather than "NOT STARTED" — a deliberate distinction (Atlas isn't
  missing a destination, it was never supposed to have one).

---

### Decision: CinemaK produces Stories

- **Reason:** CinemaK's ownership (long-form narrative) is exactly what "Story" means as a content
  format — consistent with `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` Section 5.4's conclusion
  that Story is a property of an Experience/format, not its own taxonomy layer.
- **Tradeoffs:** CinemaK is also, per the maturity ladder, the single most expensive rung any
  Franchise climbs (real production budget, not incremental content work) — meaning it will always
  be the rung with the fewest Franchises reaching it at any given time, which is a resourcing fact
  to plan around, not a sign of the model failing.
- **Alternatives rejected:** promoting "Story" to a Level-1-adjacent taxonomy concept of its own —
  explicitly rejected in `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` Section 5.4, on the grounds
  that it would duplicate what Activity + Product already express.
- **Implementation impact:** none new.

---

## Summary of open items this log surfaces (not resolved here)

1. `avatark`'s presence in `PRODUCT_REGISTRY` vs. "AvatarK is identity, not a product" —
   unresolved tension, needs a deliberate future decision.
2. "Four Activities" (this brief's own phrasing) vs. the corpus's actual, consistent five —
   unresolved discrepancy, flagged rather than silently picked.
3. The Compete-vs-Together split, proposed once and not adopted — recorded as a considered-and-
   rejected alternative in two separate decisions above, for anyone who revisits it later.

None of these blocks the freeze this pass performs — they're exactly the kind of finding a freeze
review exists to surface before implementation starts, so they aren't discovered mid-build instead.
