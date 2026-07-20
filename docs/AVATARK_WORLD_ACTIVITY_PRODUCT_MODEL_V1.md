# AvatarK World / Activity / Product Model — V1

**Status:** architecture synthesis only. No code, no repository changes, no migrations, no edits to
any previously ratified document (Architecture Freeze, Design System, Identity Platform, Entry
Journeys, Product Registry, Product Discovery Integration, Multi-door Ecosystem, Practice
Ownership, Arena/Prometheus Separation). This document sits **above** all of them and explains how
they compose into one consumer-facing architecture; it does not restate their contents, and where
it disagrees with a detail in an unratified working document (Product Discovery Integration V1,
itself still a design doc, not yet built), it says so explicitly rather than silently overriding it.

**Author's stance:** the brief for this document explicitly asked for critique, not ratification.
Sections 3–5 do that critique before Section 6 commits to a recommended shape. Where the proposed
Level 0–4 stack is right, this document says why. Where it's wrong or underspecified, it says that
too, and proposes a corrected version — of *this new layer only*. Nothing below touches the
Registry's existing schema, the Discovery Integration doc's proposed `IntentCategory`/entry-point
model, or any repository.

---

## 1. The observation, taken seriously

Nobody opens AvatarK because they want "GameK." They open it because they want to explore
Krishna, practice yoga, get better at leadership, or watch something. The product is the
*implementation* a want gets fulfilled through; it is not the want itself. Every layer built so
far (Identity → Registry → Navigation) answers "how does a user get to the right product." None
of it answers "how does a user get to the right *want*." That's the gap this document addresses.

This is a real gap, not a rebranding exercise. The existing Product Registry's `IntentCategory`
proposal (Discovery Integration V1, Section 3.2 — `practice`, `compete`, `play`, `watch`,
`create`, `explore`, `manage-wellness`, `administer`) is the closest existing artifact to this
idea, and it's worth naming up front: **this document's "Activities" (Level 2, below) and that
document's `IntentCategory` are the same concept, arrived at from opposite directions** — that one
bottom-up (from routing mechanics), this one top-down (from user psychology). They should
eventually be reconciled into one taxonomy. This document does not edit that file to do so
(instruction: don't rewrite ratified/existing documents) — it flags the convergence and the one
real mismatch found (Section 5.5) for whoever does that reconciliation.

---

## 2. The proposed stack, stated plainly

```
Level 0   AvatarK                         the ecosystem itself, the trust/identity root
             │
Level 1   Worlds                          Krishna, Rama, Yoga, Leadership, AI,
             │                             Entrepreneurship, Science, Medicine,
             │                             Manufacturing, Family, Finance, …
Level 2   Activities                      Explore · Practice · Together · Watch · Create
             │
Level 3   Products                       GameK · PrometheusK · ArenaK · StreamK ·
             │                             CinemaK · StudioK · Atlas · AvatarK Platform
Level 4   Registry                        entry points, intent routing, capabilities,
                                           visibility, feature flags, domains
```

Taken at face value, this is a plausible shape. Section 3 says why. Sections 4–5 say why it's not
quite right as written, and what specifically needs to change before it's a real architecture
rather than a good slide.

---

## 3. What's right about it

- **It correctly separates want from implementation.** A user picking "Krishna" and later ending
  up in PrometheusK's practice runtime is a materially better story than a user having to know
  what PrometheusK is. This is the whole point and it's sound.
- **It composes with what's already built, not around it.** Level 3→4 is exactly the Product
  Registry and Discovery Integration work already done — this document adds two layers *above* it
  rather than replacing anything. `AvatarKProduct.category` (already in the shipped schema:
  `platform | practice | game | competition | streaming | media | creation | exploration |
  wellness`) is a coarse-grained cousin of "Activity" already sitting in real, committed code — a
  good sign the intuition is aimed at something real, not invented from nothing.
- **It preserves the no-reimplementation rule for free.** Because Worlds and Activities are
  *labels over* products, not new runtimes, the RC1-era rule ("AvatarK never renders another
  product's UI, it links out") survives structurally — there is no new place to accidentally build
  a competing practice/game/streaming experience. See Section 7 for why this holds by
  construction, not by discipline alone.

---

## 4. Where it's underspecified or wrong

### 4.1 "World" is doing two jobs at once

Look at the actual Level 1 examples: `Krishna, Rama, Yoga, Leadership, AI, Entrepreneurship,
Science, Medicine, Manufacturing, Family, Finance`. Sort them by what they actually *are*:

| Kind | Members |
|---|---|
| A named figure / narrative-tradition anchor | Krishna, Rama |
| A subject / discipline / life domain | Yoga, Leadership, AI, Entrepreneurship, Science, Medicine, Manufacturing, Family, Finance |

Nine of the eleven examples are *topics*. Two are *personas*. Treating them as one flat, undated
list works right up until someone asks the obvious next question: **where does "Krishna's teaching
on Leadership" live?** Under a flat single-axis model, it has to be arbitrarily filed under
Krishna *or* Leadership, and the other becomes invisible — a user exploring Leadership never
discovers the Krishna-framed version, and vice versa. That's not a hypothetical edge case; it's
the single most obvious piece of content this ecosystem would want to produce (a persona teaching
a domain), and the flat model can't represent it without duplication.

**This is the Section 5 "World vs. Franchise" question, and the answer matters architecturally,
not just semantically.**

### 4.2 Registry is not "below" Products in the user's journey

Level 4 is drawn as the next stop after Level 3, as if a user descends from GameK into "the
Registry" the way they descend from a World into an Activity. They don't. The Registry is metadata
and routing logic that's *already been consulted* by the time a user reaches a product — it's what
got them there. Drawing it as a fifth sequential floor is a category error: it isn't a floor, it's
the elevator shaft running behind all of them. Section 6 redraws this.

### 4.3 The Activity list doesn't match the Krishna example the brief itself gives

The brief lists five Activities: `Explore, Practice, Together, Watch, Create`. Its own worked
Krishna example routes through **Explore → GameK, Practice → Prometheus, Challenge → Arena, Watch
→ Stream, [then] → Cinema**. "Challenge" isn't one of the five listed Activities, and Cinema
appears with no Activity label distinct from Stream's "Watch." Two real questions fall out of
this:
- Is **competing** (ArenaK's whole reason for existing) a distinct Activity from **Together**
  (which reads more like co-practice / community / shared presence), or is competition a *mode of*
  Together? These are genuinely different user intents — wanting company is not the same want as
  wanting a scored contest — so collapsing them loses information the Registry's own
  `supportsChallenges`/`supportsLeagues` capability flags already treat as distinct from
  `supportsOrganizations`. **Recommendation: Activities should be six, not five** — add `Compete`
  alongside `Together`, rather than overload `Together` to mean two different things.
- Is **long-form narrative** (CinemaK) really the same Activity as **live/on-demand streaming**
  (StreamK), just two products serving one "Watch" want? Plausibly yes — a user's want ("watch a
  story") is genuinely the same whether it's delivered as a stream or a film — but this means
  Activity→Product is legitimately **one-to-many**, not one-to-one, and the model needs to say so
  explicitly rather than imply a clean 5-Activity-to-8-Product grid (see 4.4).

### 4.4 The Activity × World matrix is sparse, not dense — and pretending otherwise is the actual risk

The stack as drawn implies every World lights up every Activity through some Product. It doesn't,
and forcing it to would be worse than leaving cells empty. Two concrete cases:

- **Atlas doesn't cleanly map to any Activity at all.** Its stated ownership is "institutional
  knowledge" — that's not something a user *does* (explore/practice/compete/watch/create), it's a
  substrate other Activities *draw on* (e.g., Explore content about Manufacturing is presumably
  grounded in facts Atlas holds). Filing Atlas as a peer of GameK/PrometheusK/ArenaK/StreamK/
  CinemaK/StudioK at Level 3 — which the brief's ownership section does, and which this document
  does not overturn — creates a structural asymmetry worth naming: Atlas is a **product with no
  Activity of its own**, more accurately a knowledge service other Activities call into. That's
  fine as an architecture, but the stack diagram should show it as a side input, not force it into
  the same Activity-mapped row as everything else (see Section 6 diagram).
- **Not every World naturally supports every Activity via the products that exist today.**
  "Practice" (PrometheusK) is a real product with a real, already-built identity: reflection,
  guided practice, Living Echo — a personal/contemplative frame. Does "practicing AI" or
  "practicing Manufacturing" fit that frame, or does it quietly need PrometheusK to become a
  generic skill-drilling engine it was never designed to be? This isn't rhetorical — Section 6.4
  works the AI example specifically because it's the clearest case where the matrix cell is
  genuinely uncertain, not just unbuilt.

**The fix is not a new layer — it's refusing to claim the matrix is dense.** Model World × Activity
→ Product as a real, sparse mapping (some cells populated, some explicitly empty), not a
guaranteed grid. A World with no Practice offering today should show no Practice entry point,
exactly the same honesty discipline the Registry itself already applies to `null` fields.

### 4.5 Scale and curation aren't addressed, and will become real problems

Eleven Worlds fits on a home screen. A hundred won't. The brief doesn't ask this document to solve
curation/grouping, so it won't propose one — but it's worth flagging as a known limit of a flat
World list, the same way Section 4.1 flagged a known limit of a flat *taxonomy*. Whoever builds
the home surface will hit this within the first few dozen Worlds.

---

## 5. Naming: World, Franchise, Theme, Story — direct answers

### 5.1 Is "World" correct?

Partially. It's the right word for the **consumer-facing, user-visible label** — "enter the
Krishna world," "enter the Leadership world" both read naturally. It's the wrong word for the
**internal modeling primitive**, because (Section 4.1) there are two different kinds of thing
hiding under one name.

### 5.2 Does "Franchise" belong here? Is World different from Franchise?

Yes, and yes — they are different, and both are needed:

- **Franchise** = a named persona, character, or narrative tradition with its own identity,
  voice, and canon: **Krishna, Rama**, and any future one (a teacher, a fictional guide, a
  historical figure). A Franchise is *who is speaking* or *whose story this is*.
- **Theme** (not "World") = a subject, discipline, or life domain: **Yoga, Leadership, AI,
  Entrepreneurship, Science, Medicine, Manufacturing, Family, Finance**. A Theme is *what this is
  about*.

These are orthogonal, not a hierarchy in either direction. Leadership content can exist with no
Franchise attached (secular leadership material) or *inside* a Franchise (Krishna's teaching on
leadership, per the Bhagavad Gita's own framing of Arjuna's leadership crisis — a real, obvious
example, not a stretch). Krishna as a Franchise can express itself through *multiple* Themes
(Leadership, Family/duty, Decision-making, Yoga) rather than being one Theme itself.

**"World," then, is the umbrella consumer-facing entry point, and it is populated by one of three
underlying shapes:**

```
World = Theme                     e.g. "AI" — no Franchise anchor, generic
World = Franchise                 e.g. "Krishna" — the persona itself, all its Themes pooled
World = Theme × Franchise         e.g. "Krishna on Leadership" — a specific expression
```

This is more than a naming nicety — it's what makes the Level 1 list stop being a flat, ever-
growing, semantically-mixed list, and start being two smaller, independently-curated lists
(Themes, Franchises) that combine to *generate* Worlds, including combinations nobody manually
curated in advance.

### 5.3 Does "Theme" belong here?

Yes — see 5.2. It's the missing half of "World" that makes the model internally consistent.

### 5.4 Does "Story" belong here?

No, not as a peer of World/Theme/Franchise/Activity. "Story" describes a **content format**
(long-form narrative, as CinemaK owns), not a *want* or a *subject*. A user's want is still
"Watch" (an Activity) or "Explore" (a different Activity, if the story is interactive); "Story" is
a property of *which product/format* answers that want — CinemaK's long-form narrative vs.
StreamK's live/on-demand vs. GameK's interactive-exploration story. Promoting "Story" to a
taxonomy level would duplicate what Activity + Product already express. It belongs one level down,
as a tag on an Experience (Level 5, Section 6), not as a new Level.

### 5.5 So: does Krishna belong under World or Franchise?

**Franchise.** Krishna is a persona/tradition, not a subject — it can express itself through many
Themes (Leadership, Family, Yoga, Decision-making), the same way a Theme (Leadership) can be
expressed with or without a Franchise attached. Filing Krishna as a "World" in the sense of "one
undifferentiated bucket" is what causes the crossover problem in 4.1. Filing it as a Franchise —
with "World" as the resulting user-facing label once a Franchise (optionally crossed with a Theme)
is chosen — resolves it.

---

## 6. Corrected model

### 6.1 The stack, redrawn

```
 Level 0   AvatarK
              │           ecosystem / identity / trust root — already built
              ▼
 Level 1   World  =  Theme  ⨯  Franchise  (either alone, or combined)
              │
              │      Theme:      Yoga, Leadership, AI, Entrepreneurship, Science,
              │                  Medicine, Manufacturing, Family, Finance, …
              │      Franchise:  Krishna, Rama, …
              │      (a World is a curated *presentation* of one or both — see 6.2)
              ▼
 Level 2   Activity                  Explore · Practice · Compete · Together · Watch · Create
              │                      (six, not five — see 4.3; mapping to a World is
              │                       SPARSE, not guaranteed dense — see 4.4)
              ▼
 Level 3   Product                   GameK · PrometheusK · ArenaK · StreamK · CinemaK ·
              │                      StudioK · AvatarK Platform
              │                      (Atlas: knowledge substrate, not an Activity
              │                       destination — feeds Explore/Practice content
              │                       rather than being one; see 4.4)
              ▼
 Level 4   Experience                a specific session/instance a Product serves:
                                      this practice, this match, this stream, this story

  ══════════════════════════════════════════════════════════════════════════
   Registry (entry points · intent routing · capabilities · visibility ·
             feature flags · domains) is NOT a level below Products.
             It is the substrate every level above queries to move
             a user from one level to the next. Already built at
             Level 3→4 (Product Registry); this document's World/Theme/
             Franchise/Activity layers are new registrable concepts
             the SAME substrate should eventually carry, not a parallel
             mechanism.
  ══════════════════════════════════════════════════════════════════════════
```

### 6.2 How a World is actually assembled (not user-authored per combination)

```
                    ┌───────────────┐         ┌────────────────┐
                    │    Themes      │         │   Franchises    │
                    │  (curated list)│         │  (curated list) │
                    └───────┬────────┘         └────────┬───────┘
                            │                            │
                            └─────────────┬──────────────┘
                                          ▼
                              World = a presentation of
                              Theme, or Franchise, or both
                                          │
                    ┌──────────┬──────────┼──────────┬───────────┐
                    ▼          ▼          ▼          ▼           ▼
              "AI"          "Krishna"  "Krishna on   "Leadership"  …
              (Theme only)  (Franchise  Leadership"  (Theme only)
                             only, all   (Theme ×
                             its Themes  Franchise)
                             pooled)
```

Nobody hand-authors every Theme×Franchise combination up front. Most Franchises will only ever
populate a handful of Themes with real content (Krishna clearly supports Leadership and Family;
it's much less obvious it should ever support "Manufacturing"). The combination surfaces only
where real content backs it — the same "don't claim what isn't real" discipline the Product
Registry already applies to `null` fields (Section 4.4 restated at the World level).

### 6.3 Krishna, worked fully

```
                                   AvatarK
                                      │
                                      ▼
                              World: Krishna
                        (Franchise, all Themes pooled)
                                      │
        ┌───────────┬────────────────┼────────────────┬──────────────┐
        ▼           ▼                ▼                ▼              ▼
    Explore      Practice          Compete           Together        Watch
        │           │                │                                │
        ▼           ▼                ▼                                ▼
      GameK    PrometheusK         ArenaK                      StreamK / CinemaK
        │           │                │                                │
        ▼           ▼                ▼                                ▼
   Experience:  Experience:     Experience:                     Experience:
   interactive  a guided        a discipline                    a Krishna-story
   Krishna-     reflection on   challenge among                 stream, or a
   world        Gita themes     peers, framed by                long-form Krishna
   exploration                  Krishna's teaching               narrative film
```

(No "Create" or generic "Together" branch shown — not because they're forbidden, but because
nothing in this document claims content exists there yet; per 4.4, an empty cell is honest, not a
gap to paper over.)

### 6.4 Leadership, worked fully — a Theme with no Franchise required

```
                                   AvatarK
                                      │
                                      ▼
                            World: Leadership
                          (Theme only — generic,
                           no persona required)
                                      │
        ┌───────────┬────────────────┼────────────────┬──────────────┐
        ▼           ▼                ▼                ▼              ▼
    Explore      Practice          Compete           Together        Watch
        │           │                │                                │
        ▼           ▼                ▼                                ▼
      GameK    PrometheusK         ArenaK                      StreamK / CinemaK
        │           │                │                                │
        ▼           ▼                ▼                                ▼
   Experience:  Experience:      Experience:                    Experience:
   a leadership a reflective     a case-study                   a leadership
   decision     leadership       challenge scored                talk or
   simulation   practice drill   against peers                  documentary

        ▲
        │  Atlas (institutional knowledge — leadership frameworks,
        │  case-study source material) feeds Explore/Practice content
        │  from the side. It is not itself a destination Activity.
```

Note the same World, crossed with the **Franchise** Krishna, would specialize into "Krishna on
Leadership" — same Activity shape, different voice and source material, without duplicating the
Theme.

### 6.5 AI, worked fully — the honest, uncertain case

```
                                   AvatarK
                                      │
                                      ▼
                                World: AI
                             (Theme only)
                                      │
        ┌───────────┬────────────────┼────────────────┬──────────────┐
        ▼           ▼                ▼                ▼              ▼
    Explore      Practice?         Compete           Together        Watch
        │           │                │                                │
        ▼           ▼                ▼                                ▼
      GameK     UNCERTAIN         ArenaK                      StreamK / CinemaK
        │      (see below)          │                                │
        ▼                           ▼                                ▼
   Experience:                  Experience:                    Experience:
   an interactive               an AI-scenario                 AI talks,
   AI-scenario                  challenge among                explainers,
   simulation                   peers                          documentaries
```

**Why "Practice" is marked uncertain, deliberately:** PrometheusK's shipped identity (reflection,
guided contemplative practice, Living Echo) is a *personal/reflective* frame. "Practicing AI"
plausibly means something like skill drills or scenario rehearsal — a different shape of activity
than reflection. Forcing it into PrometheusK either stretches that product's identity past what it
was built for, or quietly produces a second, different kind of "Practice" hiding under one label.
This document does not resolve that (out of scope — no repo changes, no product-ownership
changes) — it surfaces the uncertainty explicitly, which is exactly what Section 4.4 argued the
model should do everywhere, not just here.

---

## 7. Ownership is preserved — why, structurally, not just by policy

Every product keeps exactly what it already owns:

| Product | Owns | Unchanged by this document |
|---|---|---|
| GameK | gameplay, world/game state | yes — World/Activity route *to* it, never around it |
| PrometheusK | practice, reflection, Living Echo | yes |
| ArenaK | competition: challenges, leagues, rankings | yes |
| StreamK | streaming | yes |
| CinemaK | long-form narrative | yes |
| StudioK | creation tools | yes |
| Atlas | institutional knowledge | yes — clarified as substrate, not relabeled as owned by anything else |

The World and Activity layers **only ever resolve to an existing Product's existing entry point**
(Level 3→4, already-built Registry mechanics). There is no version of this model in which a World
or Activity renders its own gameplay, practice runtime, competition logic, or player — that would
require this document to invent a new runtime, which it explicitly does not do. Ownership holds
structurally: the new layers have no rendering surface of their own to leak into, only a routing
surface. This is the same shape as Section 8's "products are product-owned, the registry only
links out" already established in Discovery Integration V1 — this document extends that guarantee
two levels higher, not around it.

---

## 8. Answers to the direct questions

**Should the home experience expose Products or Worlds?**
Worlds (i.e., Themes and Franchises), as the primary and default surface — this is the entire
point of Section 1's observation. Products should not be the primary home taxonomy. However,
**returning, habitual users should skip the World layer entirely** — this already exists in
practice: the ratified RC4 "practice continuation" pattern sends a returning user straight back
into PrometheusK's own homepage rather than re-showing onboarding/intent surfaces. The World layer
is for *discovery and intent*, not a mandatory checkpoint on every visit. Products should still be
directly reachable as a secondary/explicit surface (account, entitlements, "you have access to
these") for users who already know what they want.

**Should users ever see product names?**
Yes, but not as required navigational knowledge. Product names belong in: account/entitlement
surfaces ("Manage your PrometheusK access" — already how `@avatark/account`'s Products/Membership
tabs work today), small in-experience attribution once a user has already arrived (comparable to a
streaming platform crediting the studio without requiring the viewer to have known it beforehand),
and admin/support contexts. A user should never *need* to know "PrometheusK" to reach a practice —
only be able to *learn* it once there, if they look.

**When should branding transition from AvatarK to GameK/Prometheus/etc.?**
At the exact boundary where a Product's own runtime begins — i.e., the same handoff point the
Identity Platform / Entry Journeys work already built for PrometheusK (the witness → borrow
handoff). World and Activity selection stay AvatarK-branded (optionally skinned per-World — a
Krishna World might carry a distinct visual tone while still being unmistakably part of AvatarK);
the moment a user crosses into an actual Experience (Level 4), that product's own brand takes over,
because that's also precisely where ownership (Section 7) takes over. Branding transition and
ownership transition are the same line, by design — this is a feature, not a coincidence: it means
a user is never confused about who's now responsible for what they're looking at.

**What should remain invisible?**
- All Level-4-in-the-original-numbering Registry mechanics: entry point ids, intent-routing
  scoring, capability flags, feature-flag names, raw domains. This is plumbing, never UI.
- Any Product whose `visibility` is `internal`, or whose `status` is `alpha`, per the already-
  ratified Registry rules — the World/Activity layers must inherit these gates, not bypass them by
  routing around the Registry's own visibility logic.
- The Theme-vs-Franchise modeling distinction itself. A user experiences "Krishna" or "Leadership"
  or "Krishna on Leadership" as one coherent World; they never need to know one is internally
  tagged Franchise and the other Theme. That distinction exists to keep the *catalog* coherent
  (Section 4.1), not because a user benefits from seeing it.
- Which specific empty cells in the World × Activity matrix are "not built yet" vs. "deliberately
  will never exist" (e.g., AvatarK the Platform itself has no consumer World at all — it is the
  root, not a destination). Silence, not a "coming soon" placeholder, is the honest default for an
  unpopulated cell, consistent with how the Registry already treats unconfirmed data as `null`
  rather than a guess.

---

## 9. Non-goals (explicit)

- No code, no repository edits, no migrations.
- No edits to Architecture Freeze, Design System, Identity Platform, Entry Journeys, Product
  Registry, Product Discovery Integration, Multi-door Ecosystem, Practice Ownership, or the
  Arena/Prometheus Separation document — all treated as ratified and load-bearing beneath this
  one.
- No new products, no new ownership claims, no change to any product's ownership boundary
  (Section 7 is a restatement, not a revision).
- No resolution of the AI/Practice uncertainty (6.5), the Activity-naming reconciliation with
  `IntentCategory` (Section 1), or the curation/scale question (4.5) — named as open, not decided,
  because deciding them is out of this document's scope.
