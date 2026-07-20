# AvatarK Architecture Index — V1

**Status:** governance/indexing pass. No redesign, no renames, no new concepts, no navigation
changes. This document reviews the existing corpus and organizes it; it does not add to the
architecture itself. Where the review found a real inconsistency in the existing corpus, it says
so (Section 3) rather than silently smoothing it over — that's what a freeze review is for.

**Scope:** this index covers `avatark-platform-web/docs/`, the only architecture corpus actually
reviewable from this repo. `docs/UPSTREAM_ISSUES.md` is intentionally excluded from the per-document
listing below — it's a live third-party-package bug tracker, not an architecture decision, and is
named here so its absence isn't mistaken for an oversight.

**On the "Owner" field below:** this repo has no per-document named-individual ownership system,
and inventing one would violate the same no-fabricated-data discipline already established for
Products (`PRODUCT_REGISTRY.md`: `owner: null` for every product, because no ownership data exists).
"Owner" below names the **workstream/track** responsible, not a person.

---

## 1. Corpus map

Three tracks, in the order they were actually built:

```
 Track A: Onboarding & Cross-Product Integration (RC1–RC6)
   PLATFORM_FOUNDATION → LEGACY_ROUTE_MIGRATION → ONBOARDING_ROUTE_CONTRACT →
   ONBOARDING_VERIFICATION → INVITATION_MIGRATION → RC4_SPEC → RC4_ROUTE_CONTRACT →
   RC4_INTEGRATION_REPORT → RC5_SPEC → RC5_HANDOFF_CONTRACT

 Track B: Identity / Account / Platform Admin
   IDENTITY_ACCOUNT_ADMIN_HANDOFF → PLATFORM_COMPLETION_CHECKPOINT

 Track C: Ecosystem / Franchise Architecture (this session)
   PRODUCT_REGISTRY → PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1 →
   AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1 → FRANCHISE_PRODUCT_RELATIONSHIP_V1 →
   AVATARK_ECOSYSTEM_ROADMAP_V1
```

Tracks A and B are executed, verified work (real commits, real tests, real hosted checks). Track C
is architecture — Sections C1–C2 are RATIFIED as *decisions*; none of it is implemented in running
code yet (see the Implementation Readiness table, Section 4). These are two different meanings of
"done," and this index keeps them distinct rather than collapsing them.

---

## 2. Per-document index

### Track A — Onboarding & Cross-Product Integration

**`PLATFORM_FOUNDATION.md`**
- Purpose: earliest checkpoint — domain ownership sketch (AvatarK owns identity/account; PrometheusK owns practices/Echo; ArenaK owns Arena; GameK owns FlowK/PathK/ChronicleK/GeometriK; Atlas owns Industrial Twin; Studio owns media production).
- Status: historical, largely superseded in substance (its "not yet included" list — schema, auth, `/account` — is now all built, per Track B).
- Owner: Onboarding/RC track.
- Depends on: none (earliest doc).
- Supersedes: none. Superseded by: `IDENTITY_ACCOUNT_ADMIN_HANDOFF.md` (identity/account substance), `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` (ownership model substance, formalized).
- Used by: cited as prior art in Track C's ownership reasoning.
- Implementation priority: N/A — historical.
- Ratified or Proposal: **RATIFIED** (historical, accepted at the time).

**`LEGACY_ROUTE_MIGRATION.md`**
- Purpose: inventory/classification of legacy `avatark-web` routes (Rebuild/Redirect/Proxy/Retain/Retire).
- Status: inventory only, partially corrected by later audit.
- Owner: Onboarding/RC track.
- Depends on: `PLATFORM_FOUNDATION.md`.
- Supersedes: none. **Partially corrected by** `ONBOARDING_ROUTE_CONTRACT.md` (its stated rationale for retaining `/enter/[token]` didn't match real code — flagged, not silently fixed, in that document).
- Used by: `ONBOARDING_ROUTE_CONTRACT.md`, `INVITATION_MIGRATION.md`.
- Implementation priority: N/A — inventory executed against as needed, not a standalone deliverable.
- Ratified or Proposal: **RATIFIED**, with the one noted correction.

**`ONBOARDING_ROUTE_CONTRACT.md`**
- Purpose: RC1 Phase 1 route audit across `avatark-platform-web`, `prometheusk-web`, legacy `avatark-web` — the source-of-truth contract for RC1.
- Status: complete, real code citations throughout.
- Owner: Onboarding/RC track.
- Depends on: `LEGACY_ROUTE_MIGRATION.md`.
- Supersedes: corrects `LEGACY_ROUTE_MIGRATION.md`'s `/enter/[token]` rationale.
- Used by: `ONBOARDING_VERIFICATION.md`, `INVITATION_MIGRATION.md`, `RC4_ROUTE_CONTRACT.md` (reconfirms this doc's finding with new evidence).
- Implementation priority: N/A — audit executed; **the one still-open finding** (PrometheusK cannot return control to Platform) is carried forward as a real, unresolved cross-repo item — see `RC4_INTEGRATION_REPORT.md`.
- Ratified or Proposal: **RATIFIED**.

**`ONBOARDING_VERIFICATION.md`**
- Purpose: RC1 Phase 2 hosted + local verification of the onboarding vertical slice.
- Status: complete, hosted-verified 2026-07-15.
- Owner: Onboarding/RC track.
- Depends on: `ONBOARDING_ROUTE_CONTRACT.md`.
- Supersedes: none.
- Used by: cited as verification precedent by every later RC-phase document.
- Implementation priority: N/A — executed. One open gap carried forward: `/enter` (no token) still 404s.
- Ratified or Proposal: **RATIFIED**.

**`INVITATION_MIGRATION.md`**
- Purpose: RC3 decision record — legacy Echo/Borrow/Threshold runtime stays historical; Platform builds its own native Meet Guide → Threshold → Orb → Borrow, converging into the existing RC1 PrometheusK pipeline.
- Status: accepted, implemented, hosted-verified.
- Owner: Onboarding/RC track.
- Depends on: `ONBOARDING_ROUTE_CONTRACT.md`, `ONBOARDING_VERIFICATION.md`.
- Supersedes: none (legacy Echo product explicitly left untouched, not superseded, per its own exit criteria).
- Used by: `RC4_SPEC.md` (builds on this pipeline), `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` (no-reimplementation rule traces back to this decision).
- Implementation priority: **P2** — "Phase 1" (real practitioner content/consent model, replacing the generic placeholder guide) is explicitly deferred, still open.
- Ratified or Proposal: **RATIFIED**.

**`RC4_SPEC.md`**
- Purpose: verbatim RC4 brief — "make product boundaries disappear" via 5 deliverables.
- Status: recorded, executed.
- Owner: Onboarding/RC track.
- Depends on: `INVITATION_MIGRATION.md`.
- Supersedes: none. **Its "canonical return contract" deliverable is superseded by** `RC5_SPEC.md`'s signed-receipt architecture (RC5 spec says this explicitly).
- Used by: `RC4_ROUTE_CONTRACT.md`, `RC4_INTEGRATION_REPORT.md`.
- Implementation priority: N/A — executed with 3 of 5 deliverables hitting stop conditions (by design, not failure).
- Ratified or Proposal: **RATIFIED**.

**`RC4_ROUTE_CONTRACT.md`**
- Purpose: 5 independent pre-implementation audits (one per RC4 deliverable) against real `prometheusk-web` code.
- Status: complete.
- Owner: Onboarding/RC track.
- Depends on: `RC4_SPEC.md`.
- Supersedes: none.
- Used by: `RC4_INTEGRATION_REPORT.md`.
- Implementation priority: **P1, but out of this repo's mandate** — the canonical-return-contract and journey-sync fixes require code changes in `prometheusk-web`, not here.
- Ratified or Proposal: **RATIFIED**.

**`RC4_INTEGRATION_REPORT.md`**
- Purpose: RC4 outcome record — 2 of 5 deliverables implemented (practice continuation, recommendation entry), 3 hit stop conditions (reported, not built).
- Status: complete.
- Owner: Onboarding/RC track.
- Depends on: `RC4_ROUTE_CONTRACT.md`.
- Supersedes: none.
- Used by: `RC5_SPEC.md` (RC5 replaces the return-contract stop condition with a real architecture).
- Implementation priority: N/A — executed. Living Echo preview and full journey sync remain open, cross-repo.
- Ratified or Proposal: **RATIFIED**.

**`RC5_SPEC.md`**
- Purpose: verbatim RC5 brief — signed completion-receipt architecture replacing RC4's stopped return-contract deliverable.
- Status: recorded, executed (per memory of this repo's git history — both sides of the receipt handshake were built in `avatark-platform-web` and `prometheusk-web`).
- Owner: Onboarding/RC track.
- Depends on: `RC4_INTEGRATION_REPORT.md`.
- Supersedes: `RC4_SPEC.md`'s canonical-return-contract deliverable.
- Used by: `RC5_HANDOFF_CONTRACT.md`.
- Implementation priority: N/A — executed.
- Ratified or Proposal: **RATIFIED**.

**`RC5_HANDOFF_CONTRACT.md`**
- Purpose: what was actually built for RC5 — the receipt architecture, why an auth-token handoff was rejected, completion-determination logic.
- Status: complete, cross-repo.
- Owner: Onboarding/RC track.
- Depends on: `RC5_SPEC.md`.
- Supersedes: none.
- Used by: nothing later in this corpus directly, but architecturally is the precedent Track C's "no cross-domain auth" rule keeps citing.
- Implementation priority: N/A — executed.
- Ratified or Proposal: **RATIFIED**.

### Track B — Identity / Account / Platform Admin

**`IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`**
- Purpose: current-state summary for the identity/account/organizations/roles/permissions/platform-admin track — the shared layer every AvatarK product integrates with.
- Status: pushed, current as of 2026-07-20.
- Owner: Identity/Admin track.
- Depends on: `PLATFORM_FOUNDATION.md` (the original domain-ownership sketch this track fully realizes).
- Supersedes: `PLATFORM_FOUNDATION.md`'s "not yet included" list (schema, auth, `/account` — all now real).
- Used by: `PLATFORM_COMPLETION_CHECKPOINT.md`, `PRODUCT_REGISTRY.md` (the registry's `lib/products/registry.ts` adapter lives in code this track built).
- Implementation priority: N/A — real, tested code (74/74 tests as of last check).
- Ratified or Proposal: **RATIFIED**.

**`PLATFORM_COMPLETION_CHECKPOINT.md`**
- Purpose: detailed per-phase (P1–P8) report for the "Platform Completion Phase" session.
- Status: complete, pushed.
- Owner: Identity/Admin track.
- Depends on: `IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`.
- Supersedes: none.
- Used by: none later in this corpus.
- Implementation priority: N/A — executed. One standing gap: no `SUPABASE_SERVICE_ROLE_KEY`/`PLATFORM_DATABASE_URL` in this environment, so cross-user admin views are structurally verified only, never against real rows.
- Ratified or Proposal: **RATIFIED**.

### Track C — Ecosystem / Franchise Architecture

**`PRODUCT_REGISTRY.md`**
- Purpose: design record for `packages/product-registry` — the single typed catalog of all 9 products.
- Status: real, tested code exists (`tsc`/build/lint/94 tests passing) — but on `feature/product-registry-package`, **committed, not pushed, not merged**.
- Owner: Ecosystem Architecture track.
- Depends on: `IDENTITY_ACCOUNT_ADMIN_HANDOFF.md` (the `lib/products/registry.ts` this replaces was built there).
- Supersedes: the hardcoded `PLATFORM_PRODUCTS` array that previously lived directly in `lib/products/registry.ts`.
- Used by: `PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md`, `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`, `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` (all three build on its schema).
- Implementation priority: N/A — implemented. Not yet merged/pushed is the real, actionable gap.
- Ratified or Proposal: **RATIFIED**, and (uniquely in Track C) **implemented**.

**`PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md`**
- Purpose: how AvatarK discovers/routes to products without hardcoded menus — proposes entry points, intent categories, audiences, feature-flag-per-entry-point.
- Status: design only; explicitly named as already-ratified in this session's later prompts.
- Owner: Ecosystem Architecture track.
- Depends on: `PRODUCT_REGISTRY.md`.
- Supersedes: none (all its proposed fields are additive, nothing existing removed).
- Used by: `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` (its "Activity"/`IntentCategory` convergence, noted but not merged), `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`.
- Implementation priority: **P1** — the highest-priority real next code step in this whole track (add the proposed schema fields; migrate `WATCH_FIRST_URL` as the first proof), per its own Section 12.
- Ratified or Proposal: **RATIFIED** (concept); **not implemented** (code).

**`AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`**
- Purpose: the layer above products — World/Theme/Franchise/Activity/Product/Experience, critiqued rather than accepted as given.
- Status: design only; explicitly ratified per this session's later prompts ("This model is now largely ratified").
- Owner: Ecosystem Architecture track.
- Depends on: `PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md`.
- Supersedes: none directly, though its Theme/Franchise split is itself superseded in terminology (not substance) by `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`'s single-umbrella-term convention (that document's own Section 0 says so).
- Used by: `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`, `AVATARK_ECOSYSTEM_ROADMAP_V1.md`.
- Implementation priority: **P2** — conceptually settled; its concrete buildable surface is the same P1 item listed under Discovery Integration above, not a separate one.
- Ratified or Proposal: **RATIFIED** (concept); **not implemented** (code).

**`FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`**
- Purpose: no Franchise owns any Product; Prometheus's dual identity as Franchise and PrometheusK's namesake; launch-portfolio critique.
- Status: design only; explicitly ratified per this session's final prompt ("the core AvatarK architecture has now converged").
- Owner: Ecosystem Architecture track.
- Depends on: `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`.
- Supersedes: none.
- Used by: `AVATARK_ECOSYSTEM_ROADMAP_V1.md`.
- Implementation priority: **P3 — mostly editorial, not code.** Explicitly recommends the Registry gain *no* new field; its real "implementation" is disambiguation practice in future content and documentation, not a build task.
- Ratified or Proposal: **RATIFIED**.

**`AVATARK_ECOSYSTEM_ROADMAP_V1.md`**
- Purpose: 3-year content/editorial strategy — Franchise maturity ladder, Year 1–3 portfolio.
- Status: living plan, not architecture — deliberately excluded from "the core architecture" this freeze pass covers.
- Owner: Ecosystem Architecture track (content/editorial sub-track).
- Depends on: `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`.
- Supersedes: none.
- Used by: none yet (forward-looking).
- Implementation priority: N/A — content/editorial execution, not software.
- Ratified or Proposal: **PROPOSAL** (a roadmap is inherently revisable; this document itself calls its Year 3 Franchise pick a deliberate placeholder, not a decision).

---

## 3. Named concepts with no dedicated file in this repo

This session's prompts referenced several concepts as already-ratified — **Architecture Freeze,
Design System, Identity Platform, Entry Journeys, Multi-door ecosystem, Practice ownership,
Arena/Prometheus separation** — that do not correspond to any standalone file in
`avatark-platform-web/docs/`. An honest index says so rather than inventing placeholder files or
silently treating them as reviewed. Best-known mapping to where their substance actually lives in
this corpus:

| Referenced concept | Substance actually lives in | Dedicated file? |
|---|---|---|
| Architecture Freeze | This document and `ARCHITECTURE_DECISION_LOG_V1.md` | No prior file — this pass is the first artifact |
| Design System | Not located anywhere in this repo's `docs/` | No |
| Identity Platform | `IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`, `PLATFORM_COMPLETION_CHECKPOINT.md` | No file with this exact name |
| Entry Journeys | `ONBOARDING_ROUTE_CONTRACT.md`, `ONBOARDING_VERIFICATION.md`, `RC5_HANDOFF_CONTRACT.md` | No file with this exact name |
| Multi-door ecosystem | `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md` (its entire premise), `PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md` | No file with this exact name |
| Practice ownership | `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` Section 1, `PLATFORM_FOUNDATION.md`'s original sketch | No file with this exact name |
| Arena/Prometheus separation | `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` (the "ArenaK isn't Krishna Arena" rule, generalized to PrometheusK) | No file with this exact name |

This is a gap worth naming, not a blocker: none of the above is contradicted by anything in this
corpus, they simply live as embedded reasoning inside other documents rather than as their own
artifact. Whether they warrant a dedicated file is an editorial call for whoever owns documentation
practice going forward — this index doesn't create one, per this pass's own "no new documents
beyond the two requested" instruction.

---

## 4. Implementation Readiness

**Column definitions**, stated up front to avoid ambiguity:
- **Architecture** — is this product's role (Activity mapping, ownership boundary) defined in the ratified corpus?
- **UX** — does a real, working, user-facing flow exist for this product within the AvatarK ecosystem specifically (not the product's own standalone app, which may be far more built out on its own)?
- **Identity** — does this product integrate with the shared identity/auth/product-access system?
- **Navigation** — is this product reachable via registry-driven discovery (vs. a hardcoded link, or not reachable from AvatarK at all)?
- **Design** — does a formalized, ecosystem-wide design system govern this product's ecosystem-facing surfaces?
- **Data** — does Franchise/Activity-aware content data exist for this product (distinct from the product's own internal data model, which may be extensive and is out of scope here)?
- **Implementation** — overall: how much of this product's *ecosystem-architecture* role (not its standalone functionality) is real running code?

**A caveat this review must state plainly:** GameK, ArenaK, StreamK, CinemaK, StudioK, and Atlas
were not directly inspected in this session beyond confirming which have a local repository
(`gamek-web`, `streamk-web`, `cinemak-web`, `atlas-web` exist; `arenak-web` and `studiok-web` do
not, per `PRODUCT_REGISTRY.md`'s own findings). Marks for those products below reflect what the
Registry/architecture corpus claims or what's structurally knowable from this repo, not independent
verification of each product's own codebase — flagged per row rather than overclaimed.

| Product | Architecture | UX | Identity | Navigation | Design | Data | Implementation |
|---|---|---|---|---|---|---|---|
| **AvatarK** (Platform) | COMPLETE | PARTIAL — RC1/RC3/RC5 shipped, RC6 partial, no full Journey/RC6 close-out | COMPLETE — real Supabase auth, orgs, roles, product access, tested | NOT STARTED — today's nav is hardcoded (`AdminNav.tsx`, `app/page.tsx`'s literal `WATCH_FIRST_URL`); registry-driven nav is still Section-12-of-Doc-2 future work | PARTIAL — real Tailwind UI exists; no formalized ecosystem-wide design system located | COMPLETE (Product-level registry); NOT STARTED (Franchise/Activity-level, since that schema doesn't exist yet) | PARTIAL |
| **PrometheusK** | COMPLETE (Practice) | PARTIAL — practice continuation/recommendation entry shipped (RC4); canonical return, journey sync, Living Echo preview all still stop conditions | PARTIAL — its own auth exists; no shared cross-domain identity with Platform (by design, per RC5's non-token architecture) | NOT STARTED | NOT VERIFIED THIS SESSION | NOT STARTED (Franchise-level) | PARTIAL |
| **GameK** | COMPLETE (Explore) | NOT VERIFIED THIS SESSION — real, active cross-repo work exists per memory (PBM-016–019 completion-event contracts) but not independently confirmed here | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION | NOT STARTED (Franchise-level) | NOT VERIFIED THIS SESSION |
| **ArenaK** | COMPLETE (Together, per current corpus — see Section 5 of the Decision Log for the unresolved Compete-split tension) | NOT VERIFIED THIS SESSION — no confirmed local repository at all | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION |
| **StreamK** | COMPLETE (Watch) | NOT VERIFIED THIS SESSION | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION |
| **CinemaK** | COMPLETE (Watch/Stories) | NOT VERIFIED THIS SESSION | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION |
| **StudioK** | COMPLETE (Create) | NOT VERIFIED THIS SESSION — no confirmed local repository at all | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION |
| **Atlas** | COMPLETE (substrate, not an Activity destination — see Decision Log) | NOT APPLICABLE — Atlas is knowledge substrate, not a user-facing destination, by design | NOT VERIFIED THIS SESSION | NOT APPLICABLE (same reason) | NOT VERIFIED THIS SESSION | NOT STARTED | NOT VERIFIED THIS SESSION |

**The one clear, load-bearing finding from this table:** every product's **Navigation** column is
NOT STARTED. All the Track C architecture work is real and ratified as *decision*, and exactly one
piece of it (`packages/product-registry`) is real code — but zero of it is wired into anything a
user would actually see. That is the honest starting point for implementation this freeze pass was
asked to define.

---

## 5. Non-goals (explicit)

- No redesign, no renames (Products or Activities), no new consumer model, no navigation changes.
- No new architectural concepts — this document indexes what exists.
- No resolution of the gaps this review surfaced (Section 3's fileless concepts, the Navigation
  readiness gap, the Compete/Together tension flagged in the Decision Log) — named, not fixed, per
  this pass's own scope.
