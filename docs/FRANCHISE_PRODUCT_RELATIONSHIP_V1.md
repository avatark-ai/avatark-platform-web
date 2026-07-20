# Franchise / Product Relationship — V1

**Status:** architecture synthesis only. No code, no schema changes, no route changes, no edits to
any existing document — including `docs/AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`, whose
Theme-vs-Franchise split this document builds on and, where the two now diverge, explicitly
reconciles rather than silently overrides (Section 0). This document accepts the brief's premise
that `AvatarK → Franchise → Activity → Product` is now the ratified shape, and works entirely
within it.

**Author's stance, again:** two direct instructions in this brief were "do not simply agree" —
Section 4 (Prometheus as a launch franchise) and Section 5 (the example launch portfolio). Both
get a real critique with a stated position, not a restatement of the question as an answer.

---

## 0. One terminology note, then moving on

The prior synthesis (`AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`, Section 5) argued Level 1 should
split into two orthogonal axes: **Theme** (a subject — Leadership, AI, Manufacturing) and
**Franchise** (a persona/tradition — Krishna, Rama). This brief's ratified list puts Leadership,
AI, and Manufacturing under the single label **Franchise** alongside Krishna and Rama. That's a
real terminology shift, not a contradiction of substance: the earlier document's underlying worry
— that persona-anchored and subject-anchored entries behave differently and that conflating them
loses information (Section 4.1 of that document) — still holds and is still relevant to Section 5
below. This document simply uses "Franchise" as the ratified umbrella term going forward, and
where the persona/subject distinction still matters (it does, repeatedly, below), it says
**persona-type Franchise** vs. **domain-type Franchise** rather than reopening the naming
question. Nothing in the prior document is edited to reflect this; this paragraph is the
reconciliation.

---

## 1. Franchise vs. Product ownership — the core rule

**A Franchise owns *why* someone is here. A Product owns *how* the thing actually happens.**
Neither owns the other, and — critically — **no Franchise owns any Product**. Every Product is
available to every Franchise that has content for it, by construction, not by special
arrangement:

```
                         AvatarK
                            │
      ┌─────────────────────┼─────────────────────┬───────────────┐
      ▼                     ▼                     ▼               ▼
  Franchise:            Franchise:            Franchise:      Franchise:
  Krishna               Prometheus            Leadership       AI  ...
      │                     │                     │               │
      └──────────┬──────────┴──────────┬──────────┴───────┬───────┘
                 ▼                     ▼                  ▼
             Activity              Activity            Activity
        (Explore/Practice/       (same set,           (same set,
         Together/Watch/          shared)               shared)
         Create)
                 │                     │                  │
                 └──────────┬──────────┴────────┬─────────┘
                            ▼                   ▼
                    ┌──────────────────────────────────────┐
                    │   Products (owned by NO Franchise)    │
                    │  GameK · PrometheusK · ArenaK ·        │
                    │  StreamK · CinemaK · StudioK · Atlas   │
                    └──────────────────────────────────────┘
```

Products sit at the bottom of the diagram not because they're subordinate, but because they're
**shared infrastructure that every Franchise draws from**, the same way two different Themes in
the prior document could each route through GameK without either "owning" GameK. This document's
entire job is to make that same non-ownership explicit for the one case where it's easy to get
wrong: Prometheus.

---

## 2. Why Prometheus is both a Franchise and PrometheusK's namesake — without confusion

### 2.1 The two things, stated precisely

1. **Prometheus (the Franchise):** a Level-1 entry in the registry-of-wants, exactly like Krishna
   or Leadership — a persona/tradition (the Greek Titan who brings fire/knowledge to humanity at
   personal cost) that a user can Explore, Practice, do Together, or Watch content about, the same
   as any other Franchise.
2. **PrometheusK (the Product):** a Level-3 Practice-Activity implementation — the same kind of
   thing GameK is to Explore, ArenaK is to Compete, StreamK/CinemaK are to Watch. It was *named*
   after the Prometheus myth (fire/insight/transformation is an apt metaphor for guided practice
   and reflection) — that's etymology, not ownership.

These are unrelated in the ownership graph even though they share a word. **PrometheusK does not
belong to the Prometheus Franchise any more than ArenaK belongs to a "Krishna Arena."** The
brief's own framing of the ArenaK case is the correct mental model and generalizes exactly:

```
   Franchise: Krishna  ────────┐
                                 ├──► ArenaK (Compete)   ◄── ArenaK is nobody's exclusive arena
   Franchise: Prometheus  ─────┘

   Franchise: Krishna  ────────┐
                                 ├──► PrometheusK (Practice)   ◄── same rule, one level up:
   Franchise: Prometheus  ─────┤                                  PrometheusK is nobody's
   Franchise: Leadership  ─────┘                                  exclusive practice engine,
                                                                    NOT EVEN Prometheus's,
                                                                    despite the shared name
```

### 2.2 Where the real risk is — and it's real

The ownership model is clean. The *naming* is genuinely hazardous, and this document should not
pretend otherwise: a new user (or, just as likely, a new engineer or partner) encountering both
"Prometheus" and "PrometheusK" for the first time has every reason to assume PrometheusK is
Prometheus's product the way "Krishna Arena" would obviously be wrong but "Prometheus's
Prometheus-K" reads as almost tautologically *right*. That intuition is exactly backwards, and
because it's backwards in a subtle way rather than an obviously-wrong way (unlike the ArenaK case,
which nobody would misread), it is more dangerous, not less.

**This is not resolved by architecture alone — it needs to be resolved by explicit, repeated
disambiguation wherever both names could appear together:** internal documentation (this
document is one instance of that), any future onboarding copy that introduces both the Prometheus
Franchise and the Practice activity in the same breath, and internal engineering conversation
(saying "the Practice product" instead of "PrometheusK" when the Prometheus Franchise is also in
scope, to avoid the word doing double duty in one sentence). None of this requires a rename
(explicitly out of scope per this brief) — it requires the same discipline this ecosystem already
applies to honest nulls and stop conditions: naming the ambiguity instead of hoping it resolves
itself.

**One concrete guardrail worth stating now, before any content is built:** the Prometheus
Franchise's own launch content must not over-index on the Practice Activity just because of the
shared name. If Prometheus's Explore/Together/Watch cells stay thin while its Practice cell is
rich, the launch itself will visually confirm the exact misreading Section 2.2 just warned
against — "see, Prometheus really is mostly a practice thing." Parity across Activities is the
actual proof that the Franchise/Product boundary holds, not just a diagram saying so.

---

## 3. Every Franchise spans all Products — the general shape

```
              Prometheus (Franchise)                        Krishna (Franchise)
                       │                                            │
     ┌─────────┬───────┼────────┬─────────┐        ┌─────────┬─────┼────────┬─────────┐
     ▼         ▼               ▼         ▼        ▼         ▼               ▼         ▼
  Explore   Practice        Together    Watch    Explore   Practice        Together    Watch
     │         │               │         │        │         │               │         │
     ▼         ▼               ▼         ▼        ▼         ▼               ▼         ▼
   GameK   PrometheusK      ArenaK    StreamK   GameK   PrometheusK      ArenaK    StreamK
```

Read this as **the same four Products, reused twice, for two unrelated Franchises** — the whole
point being that PrometheusK's row is identical in shape to GameK's, ArenaK's, and StreamK's rows:
a shared resource every Franchise can call on, not a resource Prometheus gets first claim to
because of the name. This isn't a Prometheus-and-Krishna-specific fact; it is definitionally what
"Product" means at Level 3 now (Section 1). The prior document's caveat still applies and isn't
repeated in full here: this matrix is a *capacity*, not a guarantee — a Franchise with no real
Watch content yet should show no Watch entry point, exactly as before.

---

## 4. Should Prometheus be a launch Franchise?

### 4.1 The risk being evaluated is real

Launching with only Krishna, Rama, Mahabharata, and Yoga is a genuine risk, not an overstated one.
First impressions of a platform's *category* are disproportionately set by the launch catalog,
not the eventual one (a well-known effect: a service is "the thing it launched as" in public
perception long after its catalog has broadened — a general pattern, not something specific to
this ecosystem). Four-for-four items rooted in one cultural/religious tradition, at launch, with
nothing to signal otherwise, would read as "an Indian spirituality platform" to a first-time
Western visitor regardless of how the roadmap actually looks two years out. This should be taken
at face value, not argued away.

### 4.2 Does adding Prometheus actually fix that risk?

**Partially, and for a more specific reason than "it's not Indian."** Prometheus's real
contribution is narrower and worth stating precisely: it is a second **persona-type** Franchise
that isn't Hindu-tradition-rooted. That specifically answers "are all the *personas* from one
tradition?" — a real question a discerning visitor would ask. It does **not**, by itself, answer
the broader "is this platform spirituality-flavored overall?" question, because that question is
answered by the ratio of persona-type to domain-type entries in the whole launch set, not by which
single culture backs the personas. **Leadership and AI already do most of that broader work** —
they're culturally neutral by construction, with no persona attached. If the launch set had
Krishna + Rama + Mahabharata + Yoga + Prometheus and *nothing* domain-type, it would read as "five
mythological/spiritual traditions, one of which happens to be Greek" — arguably a smaller
improvement than it first appears. Prometheus is a real, worthwhile addition; it is not, alone, a
substitute for having strong domain-type entries at launch too.

### 4.3 Evaluated on the five requested axes

- **Global adoption:** strong positive. Greek mythology is core curriculum across Western
  education systems, and "Promethean" is already common English usage for boundary-pushing
  progress — the name requires zero explanation for a huge existing audience, unlike a persona a
  Western visitor has never encountered before.
- **Western audience:** strong positive, for the same reason, with a bonus: Prometheus (stealing
  fire/knowledge, at personal cost) is already the default metaphor Western tech/AI discourse
  reaches for when discussing AI risk and progress. If AI is also a launch Franchise (it is, in
  the candidate set), Prometheus sits unusually well *next to* it thematically — not a coincidence
  worth ignoring.
- **Cultural balance:** positive, but narrower than it sounds — see 4.2. It balances the *persona*
  axis specifically; it does not by itself balance the overall spiritual/secular mix.
- **Brand positioning:** mixed, and this is the one place a real cost exists, not just a benefit.
  The tonal fit is a genuine open question: the Prometheus myth ends in eternal punishment — a
  tragic, sacrificial story, versus Krishna/Rama's more dharma-and-guidance-oriented framing or
  Yoga's calm/wellness framing. That can be spun constructively ("growth costs something real," a
  legitimate and even differentiated positioning for a *practice* platform specifically), but it
  should be a deliberate editorial choice, not an unexamined default, and whoever builds
  Prometheus's actual content should decide this explicitly rather than let the myth's darker
  half surface by accident.
- **Long-term ecosystem growth:** positive. Prometheus launching alongside PrometheusK gives every
  future Franchise designer (and any future partner asking "wait, does my Franchise get its own
  version of PrometheusK, or do I use the existing one?") a concrete, load-bearing example instead
  of a hypothetical — which is exactly the "registration only, not a rebuild" story the Product
  Discovery Integration document already wants for future Franchises generally.

**Net assessment: yes, include Prometheus at launch** — the global-adoption and Western-legibility
case is strong and largely uncontested, and the cultural-balance case, while narrower than a
first read suggests, is still real and worth having. The brand-positioning tonal question (4.3)
and the naming-collision discipline (2.2) are the two things that need active management, not
reasons to exclude it.

---

## 5. Recommended launch portfolio — critiquing, not accepting, the example

The brief's example set — **Prometheus, Krishna, Leadership, AI, Yoga, Manufacturing** — is
explicitly offered for critique, not adoption. Taking that instruction seriously:

- **Manufacturing does not belong in a consumer launch set.** Leadership and AI are broadly
  aspirational, individually-relevant domains anyone might explore for themselves. Manufacturing
  reads as an industrial/B2B vertical — a reasonable domain for this ecosystem *eventually* (it's
  already a real, named Product-relevant area in this ecosystem's history), but spending one of a
  handful of scarce, high-visibility launch slots on it, ahead of far more universally-relevant
  consumer domains, looks like a strange prioritization rather than a deliberate one. **Recommend
  deferring Manufacturing to a later, more enterprise/professional-oriented expansion wave**, not
  launch.
- **Dropping Rama (implicitly, by not including it) loses a genuinely distinct, well-known
  persona for no stated reason**, and doing so while keeping only one Hindu-tradition persona
  (Krishna) actually *weakens* the "personas aren't monocultural" story from 4.2 rather than
  strengthening it — with only Krishna and Prometheus as personas, the set reads as "one from each
  of two traditions," which is thinner evidence of breadth than "two well-developed epics from one
  tradition (Krishna, Rama) plus a distinct one from another (Prometheus)." **Recommend including
  Rama.**
- **Mahabharata, as its own separate Franchise, is likely redundant with Krishna at launch** —
  Krishna is a central figure within the Mahabharata itself, so a first-launch set containing both
  risks looking like two half-built entries instead of one strong one. **Recommend folding
  Mahabharata's material into the Krishna Franchise for launch**, and revisiting it as an
  independently-scoped Franchise later only if/when it has genuinely distinct content Krishna's
  own Franchise doesn't already cover.
- **Yoga is lower-risk than its geographic origin suggests.** Unlike Krishna/Rama, Yoga has
  already been thoroughly globally secularized as a mainstream wellness practice for most Western
  audiences — it doesn't carry the same "is this religious content" read that a mythological
  persona does, even though it shares a region of origin. This is a reason to keep it with
  confidence, not a reason to second-guess it the way one might a fourth mythological persona.
- **What should fill Manufacturing's freed slot?** A domain with broad, immediate, individual
  consumer relevance and no cultural specificity — **Finance** (personal finance/wealth-building:
  near-universal demand, no persona baggage, plausible content across Explore/Practice/Together/
  Watch) or **Family** (equally universal, emotionally resonant, and notably *also* a natural
  crossover Theme for Krishna/Rama content, per the prior document's Theme × Franchise
  combination idea) are both stronger launch candidates than Manufacturing. This document
  recommends **Finance** as the default pick, with Family as a strong, defensible alternate.

**Revised recommendation (six slots, same size as the example):**

```
   Prometheus   Krishna   Rama   Leadership   AI   Yoga
```

with **Finance** as the natural seventh if a seventh slot is available, and **Manufacturing** and
a standalone **Mahabharata** explicitly deferred — not rejected, deferred, with the reasoning
above attached so a future session doesn't have to re-litigate it from scratch.

---

## 6. Effect on GameK, PrometheusK, ArenaK, StreamK, CinemaK — no renames

None of these Products change name, ownership, or runtime as a result of this document. What
changes is strictly conceptual/positioning:

- **GameK, ArenaK, StreamK, CinemaK:** no special handling needed — none of them share a name with
  a Franchise, so the Section 2.2 naming risk doesn't apply to them. Each simply needs to be
  understood (already true, per the ArenaK example the brief itself gives) as multi-Franchise
  shared infrastructure. No new documentation burden beyond what Section 1 already states in
  general.
- **PrometheusK:** the one Product this document is actually about. Behaviorally and
  architecturally, nothing changes — it was already meant to serve every Franchise's Practice
  Activity. What changes is that this must now be stated *explicitly*, internally and eventually
  in any user-facing "about this product" surface, rather than left to be inferred — because
  unlike the other four, its name actively invites the wrong inference (2.2).
- **The Product Registry schema deliberately gets no `franchise` or `ownedBy` field from this
  document**, and that omission is itself the point, not an oversight: adding one would
  re-introduce exactly the exclusivity this document exists to rule out. If a future phase needs
  to model "which Franchises currently have content routed through which Product," that
  belongs as **content-layer data** (which Experiences exist, tagged by Franchise and Activity),
  not as a Product-level ownership field — a Product's registry entry should never be able to
  answer "which Franchise is this for," because the honest answer is always "potentially all of
  them."

---

## 7. Non-goals (explicit)

- No code, schema, or route changes.
- No edits to any existing document, including `AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`,
  `PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md`, or `PRODUCT_REGISTRY.md`.
- No product renames — PrometheusK keeps its name; the fix here is disambiguation practice, not a
  new name.
- No final decision on Prometheus Franchise content's tone (4.3) or on Family vs. Finance for the
  portfolio's seventh slot (5) — both named as open editorial calls for whoever builds that
  content, not resolved here.
