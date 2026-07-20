# AvatarK Ecosystem Roadmap — V1 (Years 1–3)

**Status:** editorial/content strategy only. No code, no schema, no implementation, no new
architectural layers, no product renames, no navigation redesign. This document assumes the
architecture is converged (`AVATARK_WORLD_ACTIVITY_PRODUCT_MODEL_V1.md`,
`PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md`, `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` — all
unedited by this document) and asks a different question entirely: **given that architecture,
what should actually get made, in what order, and why, over three years?**

**One continuity note, then straight to content:** this brief asks how *Themes* mature, how
*Franchises* mature, and how *Activities* mature, as three separate questions — which reintroduces
the Theme/persona distinction from the first synthesis document even though the third document
settled on "Franchise" as the single ratified schema-level term. Both are right, at different
altitudes: everything is a Franchise at the registry level (Doc 3), and *within* that, domain-type
entries (Leadership, AI, Yoga, Medicine — call them **Theme-type Franchises**) and persona-type
entries (Krishna, Rama, Prometheus, Sherlock Holmes, Einstein — **persona-type Franchises**) mature
along genuinely different arcs, which is exactly why this document keeps discussing them
separately. No document is being contradicted; this is the same distinction, used for what it was
always for.

---

## 1. The one mechanism that makes this whole roadmap work

Every question in this brief — why these Franchises, when do new ones arrive, how do Products get
richer without new Products existing — has the same answer underneath it:

**A Franchise doesn't consume a Product. It stress-tests a Product into being more general.**

GameK didn't get built to render mythological worlds specifically, or detective puzzles
specifically, or physics thought-experiments specifically — it gets built once, and each new
Franchise that routes through it via the Explore Activity forces it to prove it can carry another,
different kind of content without a rewrite. The same is true of PrometheusK (Practice), ArenaK
(Compete/Together), StreamK/CinemaK (Watch), and StudioK (Create). **Product maturity is a
side-effect of Franchise diversity, not a separate workstream.** This is the mechanism behind
every "how does X get richer without a new product" answer in this document — it isn't restated
per-Product below because it's the same fact each time.

---

## 2. The maturity ladder (universal, both Franchise types climb it)

The brief's own progression — Story → Practices → Challenges → Competitions → Live events → StreamK
→ CinemaK → Creator ecosystem — is the right shape, and it applies to *every* Level-1 entry,
persona-type or Theme-type alike. What differs by type is where the *first* rung comes from:

```
 Stage 1   STORY              persona-type: a mythological/biographical/canonical
           (the seed)         narrative already exists to adapt (Krishna → Gita,
                               Rama → Ramayana, Prometheus → the myth itself)
                              Theme-type: no ready-made narrative — a flagship
                               curated story/case-study has to be COMMISSIONED
                               before anything else can be built (e.g. Leadership
                               needs an editorial team to choose its first
                               defining case study; nothing pre-exists to adapt)
                                          │
 Stage 2   PRACTICES          guided practice content routed through PrometheusK —
                               the Activity, not a rename of the Franchise
                                          │
 Stage 3   CHALLENGES         structured, scored tasks — early ArenaK content
                                          │
 Stage 4   COMPETITIONS       peer-vs-peer, leaderboards, seasons — ArenaK, deepened
                                          │
 Stage 5   LIVE EVENTS        scheduled, time-bound, communal — the first real
                                          Together-at-scale moment for the Franchise
                                          │
 Stage 6   STREAMK            an ongoing content channel, not one-off clips
                                          │
 Stage 7   CINEMAK             long-form, produced narrative — a real budget/
                                          production commitment, the most expensive rung
                                          │
 Stage 8   CREATOR ECOSYSTEM   the Franchise opens to community-made content via
                                          StudioK — the only stage that scales content
                                          production faster than the platform's own
                                          editorial team can
```

**A Franchise's maturity level is simply how far up this ladder it has climbed — not a separate
score, not a new field, just an honest description of which rungs have real content today.**
Nothing here proposes tracking this in the Registry (that would be a schema change, out of scope);
it's an editorial-planning concept, tracked the way any content calendar is tracked.

---

## 3. How this answers "richer Products without new Products"

Every Product accumulates general-purpose capability as a direct consequence of which rungs, on
which Franchises, have been built through it — never because the Product itself was rebuilt for
one Franchise:

| Product | What Year 1's Franchises force it to prove | What Year 2 adds | What Year 3 adds |
|---|---|---|---|
| **GameK** (Explore) | It can carry mythic-world exploration (Krishna, Rama), abstract-concept exploration (Prometheus/AI), *and* scenario-based exploration (Leadership decisions) without being three different engines | Deduction/mystery mechanics (Sherlock Holmes) and physics-thought-experiment mechanics (Einstein) — proving it isn't just "narrative worlds," it's a general interactive-exploration engine | Community-authored explorable scenarios (Creator ecosystem stage), proving the engine is authorable by non-platform creators, not just its original team |
| **PrometheusK** (Practice) | It can carry contemplative/reflective practice (Krishna, Prometheus, Yoga) *and* decision-practice (Leadership) — proving "Practice" isn't inherently spiritual just because of who launched with it (the Section 2.2 guardrail from `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md`, now actually exercised, not just argued) | Analytical/deductive-reasoning practice (Sherlock Holmes), inquiry/curiosity practice (Einstein) — proving it spans contemplative-to-analytical, not one register | Practice content authored by certified practitioners/creators per Franchise (e.g. real yoga teachers, real leadership coaches) via the Creator ecosystem stage |
| **ArenaK** (Compete/Together) | Spiritual-discipline challenges alongside leadership case-study contests — different stakes, same scoring/leaderboard substrate | Trivia/deduction competitions (Sherlock), science-challenge formats (Einstein) — proving the format generalizes past "self-improvement" into general intellectual competition | Community-run leagues/tournaments (Creator ecosystem), not just platform-run seasons |
| **StreamK** | A live/ongoing channel per Franchise, proving the format isn't tied to one content genre | Genuinely different genres side by side (mythological content, mystery/detective content, science explainers) | Creator-run channels/series within a Franchise |
| **CinemaK** | First long-form produced pieces — the expensive rung, likely only 1–2 Franchises reach it in Year 1 | More Franchises reach this rung as production capacity grows; first genre diversity here too (biopic/documentary vs. dramatized-epic vs. mystery-series) | A real, multi-genre slate — the point at which CinemaK stops being "the Krishna/Rama channel" in practice, if it ever was |
| **StudioK** (Create) | Likely barely used in Year 1 — Create is the *last* rung most Franchises reach, correctly, since it requires the other rungs to have proven an audience first | Early creator tooling piloted on the most mature Year 1 Franchise (whichever reached Stage 5+ fastest) | The centerpiece: multiple Franchises' Creator ecosystems live at once — this is the actual proof-point that new Franchises no longer require platform-team content production to scale |
| **Atlas** | Institutional-knowledge backing for whichever Franchises need source-material grounding first (Krishna/Rama's textual scholarship, Prometheus's mythological/etymological grounding) | Extends into Sherlock-canon reference and Einstein/physics reference | Extends into Medicine reference (see 5.3) and Leadership research — Atlas's breadth becomes a visible cross-Franchise asset, not a single-Franchise one |

No row in this table required a new Product to exist. That is the entire claim this roadmap is
built on, made concrete rather than asserted.

---

## 4. Year 1 — Launch & Prove the Model

**Franchise roster:** Prometheus, Krishna, Rama, Leadership, AI, Yoga — the portfolio
`FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` recommended, unchanged here (no new roster decision is
being made in this document).

**Why these three specifically, restated briefly and in this roadmap's terms (not re-litigating
the prior document's full argument):**
- **Prometheus** — the load-bearing test case. It's the one Franchise whose name collides with a
  Product's name, so Year 1 is the first real chance to prove the disambiguation discipline
  (Doc 3, Section 2.2) actually holds under real content pressure, not just on paper. It also
  buys immediate Western legibility and pairs thematically with AI, both launching together.
- **Krishna** — the richest available source canon (Bhagavad Gita/Mahabharata) of any launch
  candidate, meaning it can plausibly reach Stage 3–4 (Challenges/Competitions) within Year 1
  while thinner Franchises are still proving Stage 1–2. It is the Year 1 *depth* proof: how far
  can the ladder be climbed in one year when the Story rung is already rich.
- **Rama** — proves the model supports more than one persona from the same broader tradition
  without them competing for the same content slot or collapsing into "the same thing as
  Krishna." This matters *architecturally*, not just editorially: if Krishna and Rama blurred
  together in practice, that would be a real signal the Franchise/Product separation isn't
  actually doing its job, since two personas sharing a tradition is the closest thing to a
  same-name-collision test short of Prometheus itself.

**Year 1 target ladder position:** most launch Franchises reach Stage 1–2 (Story, early Practices)
by mid-year, with Krishna plausibly reaching Stage 3 (Challenges) by year-end and everything else
holding at Stage 1–2. **This is by design, not a shortfall** — Section 4.4 of the World/Activity
document already established that an unpopulated cell is honest, not a gap to paper over; the same
applies to unclimbed rungs. Reaching Stage 5+ (Live events) in Year 1 for any Franchise would be a
warning sign of rushing production ahead of proven audience demand, not an achievement.

**Year 1 success criterion:** not content volume — it's whether GameK, PrometheusK, and ArenaK can
each honestly say they've now carried at least two *unrelated* Franchises' content without a
special case for either. That's the actual deliverable of Year 1, and it's a Product-capability
claim, not a content-calendar one.

```
 YEAR 1 — ladder position by Franchise (● = real content live, ░ = not yet, and correctly so)

              Story  Practices  Challenges  Competitions  Live  StreamK  CinemaK  Creator
 Prometheus     ●        ●           ░            ░         ░      ░        ░        ░
 Krishna        ●        ●           ●            ░         ░      ░        ░        ░
 Rama           ●        ●           ░            ░         ░      ░        ░        ░
 Leadership     ●        ░           ░            ░         ░      ░        ░        ░
 AI             ●        ░           ░            ░         ░      ░        ░        ░
 Yoga           ●        ●           ░            ░         ░      ░        ░        ░
```

---

## 5. Year 2 — Depth & Diversification

Two things happen in parallel: **Year 1 Franchises climb**, and **new Franchises arrive to
diversify the portfolio's shape**, not just its size.

### 5.1 Year 1 Franchises climbing

Krishna and Yoga (richest source material, most Year-1 momentum) plausibly reach Stage 4–5
(Competitions, first Live events). This is the point at which **Leadership graduates into what
this brief calls "its own major Franchise"** — not a re-launch, not a new decision, just the
natural consequence of climbing the same ladder everyone else climbs, reaching real Challenges/
Competitions content and a first Live event, at which point it stops reading as a thin launch-day
placeholder and starts reading as a flagship. Prometheus and Rama likely sit around Stage 3
(Challenges) — solid, unhurried progress, not required to match Krishna's pace.

### 5.2 New Franchise: Sherlock Holmes

**Timing: Year 2.** Reasoning specific to this roadmap (not repeating the prior document's launch-
portfolio critique, which was about Year 1 specifically): by Year 2 the platform has already
proven the model on wisdom-tradition and self-improvement content; Sherlock Holmes is the right
Year 2 addition because it proves the model on a *different register entirely* —
entertainment/intellectual-puzzle content, not practice-and-growth content. It also pairs
naturally with Prometheus and AI (deduction/reasoning as a shared thread) without duplicating
either. Recommended entry point: Explore first (interactive mystery-solving via GameK) and Practice
second (analytical-reasoning drills via PrometheusK) — deliberately proving PrometheusK's
generality (Section 3) on its second real test case, one year after Prometheus's own launch first
established the pattern.

### 5.3 New Franchise/Theme: Einstein and Science

**Timing: Year 2 for rights clearance and planning; Year 3 for content launch, not Year 2 content
launch.** This is a genuine gate, not a scheduling preference: unlike most historical or
mythological personas, a real, named historical figure's name and likeness can carry active
trademark/publicity-rights protections held by an estate or licensing body — this is a well-known
general risk with figures like Einstein specifically, and it means legal clearance is a real
prerequisite workstream, not a content-creation task. **Recommendation: begin clearance and
licensing conversations in Year 2, alongside a new Theme-type Franchise, "Science," that Einstein
becomes the flagship persona-crossover for** (the same Theme × Franchise combination pattern as
"Krishna on Leadership" from the World/Activity document) **— with actual content launch held for
Year 3** once clearance is confirmed. If clearance turns out to be infeasible, "Science" as a
Theme-type Franchise still stands on its own without Einstein, the same way Leadership stands
without a specific persona attached.

### 5.4 New Theme: Medicine

**Timing: Year 2, launched deliberately narrow.** Medicine has much broader immediate consumer
relevance than Manufacturing (already deferred past launch per Doc 4) — everyone has a body, health
content has enormous natural pull. But Medicine carries a real content-safety consideration
Leadership/AI/Yoga don't: a "Practice" activity framed around Medicine risks being misread as
personal medical guidance, which is a trust and liability problem this roadmap should name rather
than let an editorial team discover the hard way. **Recommendation: launch Medicine scoped
explicitly to the history, ethics, and practice-of-clinical-reasoning angle (how doctors think,
historical breakthroughs, the discipline of diagnosis as an intellectual practice) — genuinely
adjacent to Sherlock's deduction framing, a nice cross-Franchise resonance — rather than personal
health/treatment content**, which stays out of scope for this Franchise entirely, indefinitely,
unless a future document explicitly revisits that boundary with real clinical and legal review
attached.

```
 YEAR 2 — new arrivals and existing Franchises' progress

              Story  Practices  Challenges  Competitions  Live  StreamK  CinemaK  Creator
 Prometheus     ●        ●           ●            ░         ░      ░        ░        ░
 Krishna        ●        ●           ●            ●         ●      ░        ░        ░
 Rama           ●        ●           ●            ░         ░      ░        ░        ░
 Leadership     ●        ●           ●            ●         ●      ░        ░        ░   ← "major" now
 AI             ●        ●           ░            ░         ░      ░        ░        ░
 Yoga           ●        ●           ●            ●         ░      ░        ░        ░
 Sherlock       ●        ●           ░            ░         ░      ░        ░        ░   ← new
 Science        ●        ░           ░            ░         ░      ░        ░        ░   ← new (no Einstein yet)
 Medicine       ●        ░           ░            ░         ░      ░        ░        ░   ← new, deliberately narrow scope
 Einstein       (clearance/licensing in progress — no content yet, by design)
```

---

## 6. Year 3 — Ecosystem Maturity & the Creator Layer

By Year 3, the top three rungs — Live events, a real CinemaK slate, and the Creator ecosystem —
should be live for the Year 1 flagships (Krishna, and likely Leadership per 5.1), and the platform
should be able to answer the actual long-term question this whole four-document series has been
building toward: **can a brand-new Franchise, two years from now, launch with registration and
content alone, no Product work?**

- **Einstein** launches its actual content now, inside the Science Theme established in Year 2,
  assuming clearance completed on schedule.
- **A genuinely new Franchise** (unnamed here deliberately — this document doesn't invent one, per
  the brief's instruction not to propose new architecture, and a specific Year 3 content pick is an
  editorial decision for whoever is planning Year 3 when Year 1–2 results are in) should be
  demonstrably launchable using only the existing eight Products, proving the Section 1 mechanism
  at full scale rather than asserting it.
- **StudioK's Creator ecosystem stage** becomes the headline Year 3 story: multiple Franchises
  (likely Krishna, Leadership, and whichever else reached Stage 5+ by then) open to
  community-authored Explore scenarios, Practice content from certified practitioners, and
  ArenaK-hosted community leagues — the point where content velocity stops being bottlenecked by
  the platform's own production capacity.
- **Atlas's cross-Franchise breadth becomes visible** rather than incidental — by Year 3 it's
  plausibly the single asset every Franchise's Explore/Practice content quietly depends on for
  grounding, textual accuracy, and citation, which is the intended shape for institutional
  knowledge (Doc 2, Section 4.4): substrate, not a destination in its own right.

```
 YEAR 3 — flagship Franchises approaching full ladder maturity

              Story  Practices  Challenges  Competitions  Live  StreamK  CinemaK  Creator
 Krishna        ●        ●           ●            ●         ●      ●        ●        ●
 Leadership     ●        ●           ●            ●         ●      ●        ●        ●
 Prometheus     ●        ●           ●            ●         ●      ●        ░        ░
 Rama           ●        ●           ●            ●         ●      ░        ░        ░
 Sherlock       ●        ●           ●            ●         ░      ●        ░        ░
 Yoga           ●        ●           ●            ●         ●      ●        ░        ░
 AI             ●        ●           ●            ░         ░      ●        ░        ░
 Science        ●        ●           ░            ░         ░      ░        ░        ░
 Einstein       (content launches this year, inside Science)
 Medicine       ●        ●           ░            ░         ░      ░        ░        ░
 "Franchise N+1" — any brand-new Franchise, launched via registration + content only,
                   as the live proof-point of Section 1
```

---

## 7. Direct answers, collected

| Question | Answer |
|---|---|
| Why launch with Prometheus? | The load-bearing naming-discipline test case, plus strong Western legibility and AI-adjacency (Section 4). |
| Why Krishna? | Richest available source canon; the Year 1 *depth* proof of how fast the ladder can be climbed (Section 4). |
| Why Rama? | Proves the model supports multiple personas from one tradition without collapsing into each other (Section 4). |
| When should Sherlock Holmes appear? | Year 2 — diversifies into intellectual/entertainment register, second real proof of PrometheusK's generality (5.2). |
| When should Einstein appear? | Clearance/planning in Year 2, content in Year 3 — real publicity-rights gate, not a scheduling preference (5.3). |
| When should Medicine appear? | Year 2, deliberately scoped to history/reasoning, not personal health advice, due to a real trust/liability risk (5.4). |
| When should Leadership become its own major Franchise? | It launches Year 1 already; it becomes "major" — reaching Competitions/Live events — around Year 2, purely by climbing the same ladder as everything else (5.1). |
| How do Themes mature? | By deepening authoritative, cross-referenced coverage and attracting persona crossovers (e.g. Krishna × Leadership) — not by canon expansion, since there's no canon (Section 0, 2). |
| How do Franchises (persona-type) mature? | By canon depth, cross-Theme reach, and ladder progress — same ladder, but the Story rung is inherited rather than commissioned (Section 2). |
| How do Activities mature? | Indirectly — an Activity matures exactly as far as the Product serving it has been stress-tested by diverse Franchise content (Section 1, 3). |

---

## 8. Non-goals (explicit)

- No code, schema, or implementation.
- No new architectural layers, no product renames, no navigation redesign.
- No edits to any prior document in this series.
- No invented Year 3 "Franchise N+1" — deliberately left as a placeholder for a future editorial
  decision, not filled in here.
- No final ruling on Einstein clearance feasibility or Medicine's precise content boundary beyond
  the scoping principle stated (5.3, 5.4) — both real open items for whoever executes Year 2.
