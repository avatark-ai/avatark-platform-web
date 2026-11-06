import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// AVK-PROD-A11Y-01B: regression guard for the owner-approved accessibility tokens and the
// institutional component rules (A11Y-01..08). Static checks only. Rendered contrast, focus rings and
// axe are verified by the browser harnesses in the gate report.
const root = process.cwd()
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')

function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const token = (name: string): string => {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  assert.ok(m, `${name} defined as a hex value in app/globals.css`)
  return m[1].toLowerCase()
}
const SURFACES = { paper: token('--paper'), card: token('--surface-card'), silver: token('--silver-surface'), midnight: '#0a0a0f' }

test('approved token values (D-1, D-2) and --gold unchanged', () => {
  assert.equal(token('--gold-ink'), '#816323')
  assert.equal(token('--ink-muted'), '#6b675e')
  assert.match(css, /--focus-ring:\s*var\(--gold-ink\);/)
  assert.match(css, /\.avk-dark-surface\s*\{\s*--focus-ring:\s*var\(--gold\);\s*\}/)
  assert.match(css, /--gold:\s*var\(--aka-accent\);/, '--gold still bridges the unchanged brand accent')
})

test('WCAG 1.4.3: --gold-ink and --ink-muted reach 4.5:1 on paper, card and silver', () => {
  for (const t of ['--gold-ink', '--ink-muted']) {
    for (const s of ['paper', 'card', 'silver'] as const) {
      assert.ok(ratio(token(t), SURFACES[s]) >= 4.5, `${t} on ${s}: ${ratio(token(t), SURFACES[s]).toFixed(2)}`)
    }
  }
})

test('WCAG 1.4.11: the default focus ring reaches 3:1 on every institutional surface, gold on midnight', () => {
  for (const [s, bg] of Object.entries(SURFACES)) assert.ok(ratio(token('--gold-ink'), bg) >= 3, `--focus-ring default on ${s}`)
  assert.ok(ratio('#d4af5f', SURFACES.midnight) >= 3)
  assert.ok(ratio(token('--gold-ink'), SURFACES.midnight) < 4.5, 'documented: --gold-ink is not a text colour on midnight')
})

// Institutional (Scope I) source. Echo / Scope II files are out of scope and unchanged.
const INSTITUTIONAL_DIRS = ['app/canon', 'app/foundation', 'app/founder', 'app/ecosystem', 'app/living-worlds', 'components/foundation', 'components/ecosystem', 'components/legal']
const INSTITUTIONAL_FILES = ['app/page.tsx']
function institutionalFiles(): string[] {
  const out = [...INSTITUTIONAL_FILES]
  const walk = (d: string) => {
    for (const n of readdirSync(join(root, d))) {
      const p = join(d, n)
      if (statSync(join(root, p)).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push(p)
    }
  }
  INSTITUTIONAL_DIRS.forEach(walk)
  return out
}

test('A11Y-08: no institutional focus outline is hard-coded gold; all use --focus-ring', () => {
  const offenders: string[] = []
  let ringDecls = 0
  for (const f of institutionalFiles()) {
    const s = readFileSync(join(root, f), 'utf8')
    if (/outlineColor:\s*'var\(--gold\)'/.test(s)) offenders.push(f)
    ringDecls += (s.match(/outlineColor:\s*'var\(--focus-ring\)'/g) ?? []).length
  }
  assert.deepEqual(offenders, [])
  assert.equal(ringDecls, 35)
})

// Gold text that remains is allowed only where it renders on midnight or is decorative (aria-hidden).
const GOLD_TEXT_ALLOWED: Record<string, number> = {
  'components/foundation/InstitutionalFooter.tsx': 1, // column titles on midnight
  'app/canon/alignment/page.tsx': 1, // aria-hidden glyph
  'app/canon/dynamics/page.tsx': 2, // aria-hidden sequence arrows
  'app/canon/sacred-geometry/page.tsx': 1, // aria-hidden glyph
  'components/ecosystem/ExpressionLayer.tsx': 1, // aria-hidden glyph
  'components/foundation/architecture/ArchitectureOfBecomingFlow.tsx': 1, // aria-hidden glyph
  'components/foundation/architecture/FragmentedVsLongitudinal.tsx': 1, // aria-hidden glyph
  'components/foundation/sections/Question.tsx': 1, // aria-hidden glyph
}

test('A11Y-04/05: gold text remains only on midnight or decorative aria-hidden elements', () => {
  // `\bcolor:` is case-sensitive, so it matches the CSS color property only (not borderColor/outlineColor).
  const found: Record<string, number> = {}
  for (const f of institutionalFiles()) {
    const lines = readFileSync(join(root, f), 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (!/\bcolor:\s*'var\(--gold\)'/.test(line)) return
      const decorative = /aria-hidden/.test(line) || /aria-hidden/.test(lines[i - 1] ?? '')
      if (!decorative && f !== 'components/foundation/InstitutionalFooter.tsx') assert.fail(`${f}:${i + 1} gold text on a light surface: ${line.trim()}`)
      found[f] = (found[f] ?? 0) + 1
    })
  }
  assert.deepEqual(found, GOLD_TEXT_ALLOWED)
})

test('A11Y-01/02/03/07: Canon rail uses compliant tokens, no opacity on text, wraps below lg', () => {
  const s = readFileSync(join(root, 'components/foundation/canon/CanonRail.tsx'), 'utf8')
  assert.ok(!/opacity:/.test(s), 'no opacity on rail text')
  assert.match(s, /style=\{\{ color: 'var\(--ink-muted\)' \}\}/)
  assert.match(s, /style=\{\{ borderColor: 'var\(--gold\)', color: 'var\(--gold-ink\)' \}\}/)
  const ul = s.slice(s.indexOf('aria-label="Upcoming Canon chapters"'), s.indexOf('{CANON_FUTURE_ITEMS'))
  assert.match(ul, /flex-wrap/)
  assert.ok(!/overflow-x-auto|flex-nowrap/.test(ul), 'future chapters never scroll horizontally')
})

test('A11Y-06: active rail and Founder links use ink, semibold and a bronze bar (not colour alone)', () => {
  for (const f of ['components/foundation/canon/CanonRail.tsx', 'components/foundation/founder/FounderPageNav.tsx']) {
    const s = readFileSync(join(root, f), 'utf8')
    assert.match(s, /aria-current=\{active \? 'page' : undefined\}/, f)
    assert.match(s, /\$\{active \? 'font-semibold' : 'font-medium'\}/, f)
    assert.match(s, /color: active \? 'var\(--ink\)' : 'var\(--ink-dim\)'/, f)
    assert.match(s, /borderColor: active \? 'var\(--gold-ink\)' : 'transparent'/, f)
    assert.match(s, /lg:border-l-2/, f)
    assert.match(s, /border-b-2/, f)
  }
})

test('D-5: every live midnight wrapper with focusable content keeps the gold ring', () => {
  const wrappers: [string, RegExp][] = [
    ['components/foundation/InstitutionalHeader.tsx', /<header className="avk-dark-surface"/],
    ['components/foundation/InstitutionalFooter.tsx', /<footer className="avk-dark-surface"/],
    ['components/foundation/ExploreMenu.tsx', /className="avk-dark-surface motion-emerge-instant/],
    ['app/canon/page.tsx', /<section className="avk-dark-surface" style=\{\{ background: 'var\(--midnight\)'/],
    ['app/ecosystem/page.tsx', /<section className="avk-dark-surface border-t"/],
    ['components/foundation/livingWorlds/LivingWorldsIntro.tsx', /className="avk-dark-surface relative overflow-hidden"/],
    ['components/foundation/livingWorlds/WhyLivingWorlds.tsx', /className="avk-dark-surface"/],
  ]
  for (const [f, re] of wrappers) assert.match(readFileSync(join(root, f), 'utf8'), re, f)
})
