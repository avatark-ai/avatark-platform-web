import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// AVK-VISUAL-01B: static regression guards for the owner-approved visual refinements (OD-V1..V8).
// Rendered layout, contrast, focus and reflow are verified by the browser harnesses in the gate report.
const root = process.cwd()
const read = (f: string) => readFileSync(join(root, f), 'utf8')
// Source without // line comments and {/* */} blocks, for "must not contain" checks (comments name what is excluded).
const code = (f: string) => read(f).replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '').replace(/^\s*\/\/.*$/gm, '')

test('OD-V1: Echo card body is light, its CTA keeps gold with --focus-ring, both media panels share one height', () => {
  const card = read('components/foundation/sections/ExperienceCard.tsx')
  assert.match(card, /echo: \{ background: 'var\(--surface-card\)', color: 'var\(--ink\)', dim: 'var\(--ink-dim\)', border: 'var\(--paper-line\)'/)
  assert.match(card, /echo: \{ background: 'var\(--gold\)', color: 'var\(--midnight\)', outlineColor: 'var\(--focus-ring\)' \}/)
  // concept variant untouched
  assert.match(card, /concept: \{ background: 'var\(--surface-card\)', color: 'var\(--ink\)', dim: 'var\(--ink-dim\)', border: 'var\(--paper-line\)', hover: '' \}/)
  const fx = read('components/foundation/sections/FeaturedExperiences.tsx')
  assert.match(fx, /const EXPERIENCE_MEDIA_CLASS = 'h-40 lg:aspect-video lg:h-auto'/)
  assert.equal((fx.match(/EXPERIENCE_MEDIA_CLASS/g) ?? []).length, 3, 'defined once, used by Echo and Living Worlds panels')
  assert.match(fx, /style=\{\{ background: 'var\(--midnight\)', borderColor: 'var\(--paper-line\)' \}\}/, 'Echo keeps a midnight media panel')
  assert.match(fx, /action=\{\{ label: P\['AVK-PROD-CD1-01'\], href: DISCOVER_ECHO_HREF \}\}/, 'Echo CTA label and destination unchanged')
  assert.match(fx, /action=\{LIVING_WORLDS_ROUTE_ENABLED \? \{ label: U\['AVK-U03-HN-08'\], href: LIVING_WORLDS_HREF \} : null\}/)
  assert.ok(!/<img|next\/image|\.(png|jpe?g|webp|avif)['"]/.test(fx), 'no raster media')
})

test('OD-V2: Living Worlds hero stays midnight with reduced padding and a 52px maximum headline', () => {
  const s = read('components/foundation/livingWorlds/LivingWorldsIntro.tsx')
  assert.match(s, /className="avk-dark-surface relative overflow-hidden"/)
  assert.match(s, /pt-12 pb-14 text-center sm:px-8 md:py-20/)
  assert.match(s, /max-w-\[20ch\] text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-\[3\.25rem\]/)
  assert.ok(!/lg:text-6xl|md:py-28/.test(s))
  assert.match(s, /\{U\['AVK-U03-LW-01'\]\}/)
  assert.match(s, /\{C\['AVK-FR-026'\]\}/)
})

test('OD-V3: "Why Living Worlds?" is a light paper section with ink text and a paper-line divider', () => {
  const s = read('components/foundation/livingWorlds/WhyLivingWorlds.tsx')
  assert.ok(!/avk-dark-surface|var\(--midnight\)|var\(--text-dim\)/.test(s))
  assert.match(s, /style=\{\{ background: 'var\(--paper\)', color: 'var\(--ink\)', borderColor: 'var\(--paper-line\)' \}\}/)
  assert.match(s, /\{ id: 'AVK-FLW-HM-01', href: '\/foundation#living-worlds' \}/)
  assert.match(s, /\{ id: 'AVK-FLW-FD-08', href: FOUNDER_WHY_LIVING_WORLDS_HREF \}/)
})

test('OD-V4: Living Forest geometry is a decorative inline SVG with no raster or external source', () => {
  const g = read('components/foundation/geometry/LivingForestGeometry.tsx')
  assert.match(g, /aria-hidden="true"/)
  assert.match(g, /focusable="false"/)
  assert.ok(!/<image|<img|href=|url\(|https?:\/\/|VANAM|\.(png|jpe?g|webp|avif)/i.test(code('components/foundation/geometry/LivingForestGeometry.tsx')), 'no raster, link or external media')
  assert.equal((g.match(/stroke="var\(--gold-ink\)"/g) ?? []).length, 1, 'one gold-ink river group')
  const f = read('components/foundation/livingWorlds/LivingForestFeature.tsx')
  assert.match(f, /<LivingForestGeometry /)
  assert.match(f, /aspect-\[4\/3\] w-full items-end justify-center rounded-2xl border pb-6 lg:order-2 lg:max-h-\[420px\]/)
  assert.match(f, /data-testid="living-forest-inert-pill"/, 'inert pill unchanged')
  for (const id of ['AVK-FR-020', 'AVK-FR-021', 'AVK-FR-022', 'AVK-FR-023', 'AVK-FR-024', 'AVK-FR-025', 'AVK-FR-027']) assert.ok(f.includes(`C['${id}']`), id)
  for (const id of ['AVK-FLW-ST-01', 'AVK-FLW-LW-11', 'AVK-FLW-LW-19']) assert.ok(f.includes(`L['${id}']`), id)
})

test('OD-V5..V8: footer has four groups in order inside one labelled nav; WorldK stays plain text', () => {
  const s = read('components/foundation/InstitutionalFooter.tsx')
  assert.equal((s.match(/<nav /g) ?? []).length, 1)
  assert.match(s, /<nav aria-label="Footer"/)
  const order = [...s.matchAll(/<FooterColumn id="([a-z-]+)" title=\{([^}]+)\}/g)].map((m) => [m[1], m[2]])
  assert.deepEqual(order, [
    ['institutional', "V['AVK-VIS-FT-01']"],
    ['ecosystem', "U['AVK-U03-HN-04']"],
    ['living-worlds', "C['AVK-FR-003']"],
    ['company', "V['AVK-VIS-FT-02']"],
  ])
  assert.match(s, /<h2 id=\{headingId\}/)
  assert.match(s, /<ul aria-labelledby=\{headingId\}/)
  // Ecosystem: the same nine products through the unchanged X-1 resolver.
  const eco = [...s.matchAll(/ecosystemFooterLink\('([a-z]+)'\)/g)].map((m) => m[1])
  assert.deepEqual(eco, ['echo', 'prometheusk', 'arenak', 'gamek', 'streamk', 'cinemak', 'setpointk', 'atlas', 'studiok'])
  assert.match(s, /return \{ label: product\.name, href: product\.href, departure: isCrossDomain \}/)
  // Living Worlds group: internal routes; WorldK plain text with the approved status.
  assert.match(s, /\{ label: C\['AVK-FR-055'\], href: null, status: L\['AVK-FLW-ST-01'\] \}/)
  assert.match(s, /\{ label: C\['AVK-FR-021'\], href: LIVING_WORLDS_ROUTE_ENABLED \? `\$\{LIVING_WORLDS_HREF\}#living-forest` : null, status: L\['AVK-FLW-ST-01'\] \}/)
  assert.ok(!/worldk\.ai|\/enter|getProductById\('worldk'\)/i.test(code('components/foundation/InstitutionalFooter.tsx')), 'no WorldK destination')
  // Company / Legal expressions unchanged.
  assert.match(s, /\{ label: 'Contact', href: supportEmail \? `mailto:\$\{supportEmail\}` : null, external: true \}/)
  assert.match(s, /\{ label: 'Trust', href: null \}/)
  assert.match(s, /© \{new Date\(\)\.getFullYear\(\)\} AvatarK/)
  assert.match(s, /hover:underline focus-visible:underline/)
})

test('OD-V5: institutional footer items are the header items minus Living Worlds', async () => {
  const { primaryNavItems } = await import('../../components/foundation/institutionalNav.ts')
  const items = primaryNavItems().filter((i) => i.label !== 'Living Worlds')
  assert.deepEqual(items, [
    { label: 'Foundation', href: '/foundation' },
    { label: 'Canon', href: '/canon' },
    { label: 'Ecosystem', href: '/ecosystem' },
    { label: 'Founder', href: '/founder' },
  ])
})
