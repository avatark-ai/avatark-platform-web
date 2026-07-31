# Locale Architecture

Package: `@avatark/locale` (`packages/locale/`). Contract-only + real
formatting helpers; not wired into `app/` rendering yet (see "Open item"
below).

## Registry states

| State | Meaning |
|---|---|
| `available` | Materially translated, reviewed, safe for general consumers. |
| `preview` | Being validated for a small audience. Not used by any locale today. |
| `planned` | On the roadmap. No translated resource bundle exists. |

| Locale | English name | Availability |
|---|---|---|
| `en-US` | English (United States) | `available` |
| `en-IN` | English (India) | `available` |
| `es` | Spanish | `planned` |
| `fr` | French | `planned` |
| `hi` | Hindi | `planned` |
| `te` | Telugu | `planned` |
| `ta` | Tamil | `planned` |

`en-IN` reuses `en-US`'s string resource bundle verbatim (same language, no
translation divergence) but gets locale-correct date/number/timezone
formatting via `Intl` (e.g. Indian digit grouping: `12,34,567.89` vs. US
`1,234,567.89`).

A locale must never be promoted to `available` or `preview` merely by
editing the registry. Promotion requires a real, reviewed resource bundle
whose keys match `en-US`'s exactly in every canonical namespace
(`validateResourceCompleteness`) — machine-translated placeholders do not
qualify.

## Canonical translation namespaces

`auth`, `account`, `membership`, `products`, `preferences`, `privacy`,
`security`, `dataExport`, `notifications`, `organizations`, `diagnostics`.

These are owned by the canonical identity/account core. Product extensions
own their own namespaces (e.g. `prometheusk.livingEcho`) and must not add
keys to the canonical ones.

## What locale affects

- Labels — via `translate(code, namespace, key)`, falling back to `en-US`
  for any missing key.
- Dates/times — `formatDate`, `formatTime`, `formatDateTimeInTimeZone`
  (`Intl.DateTimeFormat` keyed by locale).
- Numbers — `formatNumber` (`Intl.NumberFormat`).
- Time-zone presentation — `formatDateTimeInTimeZone` accepts an explicit
  IANA zone.
- Validation messages, email-template contract, accessibility text — all
  sourced from the same namespace-keyed resource bundles; no separate
  mechanism.

Formatting for any non-`available` locale code silently resolves to `en-US`
(`resolveFormattingLocale`) rather than rendering unformatted or throwing —
this prevents a half-promoted locale from producing correctly-formatted
numbers next to untranslated English labels.

## Open item for later migration

`account_preferences.language` is already persisted per-user in the
database (confirmed in `docs/IDENTITY_RC1_AUDIT.md` §12), but nothing reads
it today. Wiring it to actually select a resource bundle and pass a locale
code into this package's formatting helpers is an `app/` migration concern
(mission Part 16), not part of this package.
