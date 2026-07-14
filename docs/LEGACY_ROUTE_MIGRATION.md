# Legacy Route Migration Inventory

**Source:** `avatark-web` (legacy), audited during this session.
**Status:** Inventory only — no routes have been migrated, redirected, proxied, or retired yet. This document classifies intent; execution is separate, future work.

Classification key: **Rebuild** (reimplement fresh in this repo), **Redirect** (temporary HTTP redirect to legacy), **Proxy** (temporarily serve legacy content through this repo's domain), **Retain on legacy subdomain** (stays on legacy, not touched), **Retire** (no longer needed).

| Legacy route(s) | Classification | Notes |
|---|---|---|
| `/enter/[token]`, `/enter/done` | **Retain on legacy subdomain** (for now) | Live invitation/QR entry flow, actively used by the BITS pilot. Must not be disturbed until this repo's own `/enter/[token]` is built and compatibility-tested (QR destinations, tokens, campaign/cohort params, return URLs all preserved) — per explicit instruction, do not repoint `avatark.ai` until compatibility tests pass. |
| `/dashboard/[token]` | **Retain on legacy subdomain** | BITS pilot live-ops dashboard. |
| `/admin/*` (bits, corpus, echoes, editorial, graph, atlas, pass-forward) | **Retain on legacy subdomain** | Real admin tooling, server-side service-role coupled. Out of this repository's scope entirely — Platform does not own admin tooling for legacy pilot operations. |
| `/api/continuity/process`, `/api/broadcast/status` | **Retain on legacy subdomain** | Scheduled cron-driven processing (confirmed via legacy `vercel.json`). |
| `/echo`, `/echo/[slug]`, `/echo/borrow`, `/echo/create`, `/echo/lineage/[slug]` | **Rebuild, Echo-first onboarding shell only** | This repository's own landing/onboarding journey ("Begin with an Echo") is a **new**, Platform-owned front door — it does not reuse legacy Echo implementation, since Echo *data* remains PrometheusK/Living-Echo-domain, never duplicated here. |
| `/my/echo`, `/my/echo/living-preview`, `/my/echo/twin-preview` | **Retain on legacy subdomain** | Real product functionality, out of Platform scope. |
| `/canon/*`, `/foundation/*`, `/patterns/*`, `/press/*`, `/products/*`, `/architecture`, `/declaration`, `/roadmap`, `/lenses`, `/lenses` | **Retain on legacy subdomain (for now)**, candidate for future **Rebuild** | Public content/marketing pages. Real redesign is anticipated ("a public experience that is going to be materially redesigned" per the architecture decision), but rebuilding is deferred — not part of this checkpoint. |
| `/library`, `/library/[slug]`, `/episodes/[id]` | **Retain on legacy subdomain** | Content library, out of Platform scope. |
| `/arena`, `/atlas`, `/care`, `/continuum`, `/dti`, `/navigator`, `/setpoint` | **Retain on legacy subdomain** | Product-domain landing pages, owned by their respective products, not Platform. |
| `/privacy`, `/terms`, `/contact` | **Rebuild** | Genuinely Platform-appropriate content (legal/contact pages naturally belong with the account/identity layer) — real rebuild, low risk, no legacy data dependency. |
| `/start` | **Rebuild** | Already scaffolded in this repo's directory structure (`app/start/`) as part of the new onboarding journey. |

## Explicitly Not Yet Decided

Full content-page-by-content-page classification for `/canon/*`, `/foundation/*`, `/patterns/*`, and `/press/*` subtrees is deferred — these are numerous, low-urgency, and depend on the anticipated broader public-experience redesign, which is out of scope for this checkpoint.
