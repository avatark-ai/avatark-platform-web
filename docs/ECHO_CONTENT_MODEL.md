# Echo Content Model

Status: implemented, feature/echo-avatark-complete-experience.

## Why this exists

Before this pass, "Guide" (`lib/onboarding/guide.ts`) and "Witness"
(`lib/onboarding/witness.ts`) were each a single hardcoded TypeScript
constant — one archetype, one practice, by design (their own comments said
so explicitly). Adding a second Echo or a second practice meant writing
code, not content.

This pass replaces that with a real content collection, following this
repo's own established convention for editorial content
(`content/foundation/*.md`, parsed by the small hand-rolled
`lib/content/markdown.ts` — deliberately no remark/MDX/CMS dependency),
extended to support *many* records instead of one document per concept.

**Adding a new Echo — including BITS Pilani, Leadership, Health, Krishna,
Rama, Prometheus, or a community-created Echo — is now a content change: add
a markdown file. It is not a code change.**

## Schema

All content lives under `content/echo/`, one file per record, read through
`lib/content/echo.ts`'s typed accessors. Never read the raw files directly
from a component.

### Echo — `content/echo/echoes/<slug>.md`

```md
---
slug: the-returner
name: The Returner
category: archetype   # archetype | organization | theme | product | community
role: CEO of a major global manufacturing company
themes: change, leadership, return
status: seed           # seed | active | community-pending
demo: false             # optional, defaults to false
---

## Mission
One paragraph: what this Echo learned.

## GiftMessage
One paragraph: the quote/handoff line shown on /guide/[slug].
```

`category` drives the eyebrow label shown on `/guide/[slug]` and
`/echo/[slug]` (`lib/onboarding/guide.ts`'s `echoCategoryEyebrow`) — an
`organization` Echo like BITS Pilani reads differently from an `archetype`
like The Returner or a `community`-authored one, without any page-level
code change.

### Practice — `content/echo/practices/<slug>.md`

```md
---
slug: the-promise-to-myself
sourceEcho: the-returner   # slug reference into echoes/
title: The Two-Minute Check-In
witnessLabel: The Promise to Myself   # narrative framing used by /witness/[slug]
duration: A few quiet minutes
modality: Guided reflection
themes: change, return, stuck, calm    # can include intention ids (see below)
status: seed
---

## Narrative
The framing story /witness/[slug] opens with.

## Purpose
What the practice actually is.

## WhyItMattered
Why it's worth doing.

## WhatYouMayNotice
What a person might notice while doing it.
```

`themes` doing double duty as intention-matching tags is intentional:
`/start/choose` and `/echo/create` both resolve a real practice via
`pickPracticeForIntention()`, which matches an intention id (`stuck`,
`calm`, `clarity`, `habits`, `leadership`, `curious` — see
`lib/onboarding/intentions.ts`) against a practice's `themes`. A second
practice with `themes: leadership` immediately starts winning that match
for visitors who chose "I want to lead better" — no code change.

`witnessLabel` vs `title`: `/witness/[slug]` (the narrative-moment page,
RC1-era) shows `witnessLabel`; `/practice/[id]` and Discover cards show
`title`. Both slugs are the same practice — this is one record, not two.

### Story — `content/echo/stories/<slug>.md`

```md
---
slug: some-story
sourceEcho: the-returner   # optional
title: A Story Title
duration: 4 min
kind: episode              # episode | live | film
creator: Some Creator      # optional
themes: change
status: seed
mediaUrl:                   # leave empty until a real, playable source exists
demo: false
---

## Description
One paragraph.
```

`mediaUrl` empty/absent renders a truthful "preview, not yet playable"
state everywhere (Watch First, Discover, Stories) — never a fake player.
`demo: true` is for a clearly-labeled illustrative entry, isolated from
real content by the `isDemo` flag every accessor surfaces; no such entry is
shipped in this pass because no illustrative Story content was needed to
exercise a real, working page — `/stories` and `/discover#stories` are
first-class components rendering zero real entries honestly today, not
placeholders.

### Collection — `content/echo/collections/<slug>.md`

```md
---
slug: beginning-with-change
title: Beginning with Change
themes: change, return
status: seed
echoes: the-returner              # comma-separated slugs into echoes/
practices: the-promise-to-myself  # comma-separated slugs into practices/
stories:                           # comma-separated slugs into stories/
---

## Description
One paragraph.
```

## Accessors (`lib/content/echo.ts`)

`listEchoes`, `getEchoBySlug`, `listPractices`, `getPracticeBySlug`,
`listPracticesByEcho`, `pickPracticeForIntention`, `listStories`,
`getStoryBySlug`, `listStoriesByEcho`, `listCollections`,
`getCollectionBySlug`, `listCollectionsForEcho`. All are plain, synchronous,
server-only (use `node:fs`) — never import this file from a `"use client"`
component; read server-side and pass data down as props instead (see below).

## Server-only constraint

`lib/content/echo.ts` uses `node:fs` and can only run in server components,
Route Handlers, or `generateMetadata`/`generateStaticParams`. Three
pre-existing client components — `components/HomeContinuity.tsx`,
`app/journey/today/page.tsx`, `app/journey/history/page.tsx` — read simple
display constants (`WITNESS_LABEL`, `PRACTICE_LABEL`, `WITNESS_SLUG`) from
`lib/onboarding/witness.ts`. That file is deliberately **not** wired to the
generalized registry (doing so would break their client bundle); it stays a
small, hand-synced mirror of the current default practice, documented
in-file. Every *new* Echo route (`/witness/[slug]`, `/guide/[slug]`,
Discover, Echo detail, Practice detail, Start Here, Echo creation) reads
`lib/content/echo.ts` directly.

**Follow-up, not done in this pass:** thread the real registry into those
three client surfaces (e.g. a small `/api/echo/default-practice` route,
mirroring the existing `fetch('/api/account/profile')` pattern in
`HomeContinuity.tsx`) once there's a second practice for them to ever need
to reflect. With exactly one practice today, the hand-synced mirror is
accurate; it just doesn't yet scale past one.

## Seed content

Migrated, not fabricated: `the-returner` (Echo) and `the-promise-to-myself`
(Practice) are the exact same content that previously lived in
`lib/onboarding/guide.ts` and `lib/onboarding/witness.ts`, moved into this
format. `beginning-with-change` (Collection) groups them — a real grouping
of real content, not a fabricated example.

## What's still a placeholder-free empty state, not fake data

- `content/echo/stories/` has no files — `/stories`, `/discover#stories`,
  and `/watch-first` all render their real, honest "no stories yet" state.
- No Community content model exists yet (no local ArenaK data) —
  `/community`'s sections are real components with honest empty states and
  a link to ArenaK's real registry domain.
