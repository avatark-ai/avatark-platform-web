# Notification Preferences (Mission Part 12)

Status: **typed preference-category contract added**; the real, live thing underneath remains a single boolean (`account_preferences.notifications_enabled`). This doc extends `docs/PLATFORM_CONTRACTS.md`'s existing Notification Center section rather than replacing it — that section remains the authority on the event/delivery-engine target state; this doc is specifically the user-facing *settings categories* the mission requires.

## Two separate axes, on purpose

`@avatark/notifications` already had `NotificationCategory` (`types.ts`) — a classification of real/future **event payloads** (`practice_completed`, `invitation_received`, `content_published`, plus the broader Phase 2 set: `invitation | reminder | recommendation | community | recognition | practice | story | challenge | organization | system`). That vocabulary answers "what kind of thing happened."

The mission's Part 12 asks a different question: "what does a signed-in user see and toggle in a notification-settings screen." That's `NotificationPreferenceCategory` (`packages/notifications/src/preferenceCategories.ts`), a new, coarser, settings-facing vocabulary:

| Category | Label | Mandatory | Notes |
|---|---|---|---|
| `security_account` | Security and account | **Yes** | Never user-disableable. |
| `invitations` | Invitations | No | |
| `practices_reflections` | Practices and reflections | No | |
| `events` | Events | No | |
| `publishing_collaboration` | Publishing and collaboration | No | |
| `recognition` | Recognition | No | |
| `product_announcements` | Product announcements | No | |
| `research_participation` | Research participation | No | Only where applicable (product opted in). |
| `care_physiological_alerts` | Care or physiological alerts | No | `requiresExplicitProductPolicy: true` — only ever shown under an explicit SetpointK policy, per the mission. |

Several `NotificationCategory` event types map onto one `NotificationPreferenceCategory` (e.g. both `practice` and `reminder` events would surface under the `practices_reflections` setting) — this is intentional coarsening, not a lost distinction; the finer-grained `NotificationCategory` remains the event-classification source of truth.

## What is real vs. contract-only

- **Real, live, persisted today:** one boolean, `account_preferences.notifications_enabled` (`supabase/migrations/003_account_preferences.sql`, read/written by `app/api/account/preferences/route.ts`).
- **Contract only, not wired to any UI or delivery mechanism:** everything in this document. `isDisableableCategory()` is a pure function or a future settings screen to call — it is not consulted by any code path today.
- This mission does not claim delivery infrastructure exists where it does not, per Part 12's explicit instruction. A future phase implementing per-category delivery must replace the single boolean with a real per-category preference table before this contract can back real behavior.

## Non-goals

- No notification delivery engine, email/push integration, or database schema for per-category preferences is introduced by this phase.
- `research_participation` and `care_physiological_alerts` are not rendered for every product — a product without an active research program or SetpointK's physiological-alerts policy simply never shows those rows (host-level filtering, not this contract's job to enforce).
