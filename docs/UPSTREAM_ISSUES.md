# Upstream Package Issues

Issues tracked here belong to packages this repo consumes, not to
`avatark-platform-web` itself. Nothing here should be worked around
further in this repo beyond what's already in place — real fixes
belong in the packages named below.

## @avatark/account 0.1.1 — inconsistent CSS variable naming

**Symptom:** some compiled components read `--aka-`-prefixed CSS
variables, others read unprefixed names for the same concept, with no
naming convention applied consistently across the package.

**Evidence** (`node_modules/@avatark/account/dist/components/*.js`):

| Component | Variable style used |
|---|---|
| `AccountHeader.js`, `ActivityTab.js`, `EchoesTab.js`, `PrivacyTab.js` | `--aka-accent`, `--aka-text-primary`, `--aka-text-dim` |
| `DataExportTab.js`, `MembershipTab.js`, `PreferencesTab.js`, `ProductsTab.js`, `ProfileTab.js`, `SignInMethodsTab.js` | `--gold`, `--text-primary`, `--text-dim`, `--surface`, `--surface-line` |

The package's own `styles.css` only defines the `--aka-*` names at
`:root`, so any component reading the unprefixed names gets no value
from the package's stylesheet at all — it falls back entirely to the
literal fallback baked into each `var(--name, <fallback>)` call (e.g.
`var(--text-primary,#f5f2ea)`). Those fallbacks happen to match the
package's intended dark theme, so this doesn't currently visibly break
anything, but it's fragile: a host that doesn't happen to duplicate the
same literal values (e.g. a themed host wanting a different palette)
would get incoherent styling with no way to override every tab
consistently through one set of variables.

**Current workaround** (`app/globals.css`): a `:root` bridge block
maps `--aka-*` names to the unprefixed names the second group of
components expects, so overriding either variable set actually reaches
every tab.

**Real fix (belongs in `@avatark/account`):** pick one variable naming
convention and align every component + `styles.css` to it, then this
repo's bridge block can be deleted.

## Tailwind v4 — package-scanning requirement for pre-compiled dependencies

**Symptom:** Tailwind v4's automatic content detection only scans this
repo's own source tree by default. `@avatark/account` ships pre-built,
already-compiled JS in `dist/` (not raw JSX/TSX source), so Tailwind
has no visibility into which of its own utility classes those compiled
files reference unless told to look there explicitly.

**Current workaround** (`app/globals.css`):

```css
@source "../node_modules/@avatark/account/dist/**/*.js";
```

This is a real, ongoing requirement, not a one-time fix — it must stay
in place for as long as `@avatark/account` (or any future pre-compiled
UI package) is consumed this way. It is not itself a bug to resolve
upstream; documented here so its purpose isn't mistaken for dead code
and accidentally removed.
