// AVK-ECOSYSTEM-WORLDK-02: source-level regression guards for the architecture-first /ecosystem (T-1..T-9 of
// AVK_NEXT_EXECUTION_READINESS_PLAN Gate 2). Runs under `node --test` in a git-less export, so "unchanged vs
// 3f073a3" checks pin SHA-256 values taken from that commit.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SCOPE_I_CLICKABLE_PRODUCT_URLS } from '../release/productDestinations.ts'
import { ECOSYSTEM_WORLDK_COPY } from './ecosystemWorldkCopy.ts'

const read = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), 'utf-8')
const code = (...p: string[]) => read(...p).replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

const PAGE = code('app', 'ecosystem', 'page.tsx')
const REL = code('components', 'ecosystem', 'RelationshipArchitecture.tsx')
const SYS = code('components', 'ecosystem', 'ExperienceSystems.tsx')
const ARCH = code('components', 'ecosystem', 'PlatformArchitecture.tsx')
const DIAGRAM = read('components', 'ecosystem', 'PlatformDiagram.tsx')

test('T-1 page order: overview -> relationship tiers -> Echo/WorldK systems -> journey; old Living Worlds section unmounted', () => {
  const order = ['<EcosystemOverview />', '<RelationshipArchitecture />', '<ExperienceSystems />', '<PlatformArchitecture />'].map((t) => PAGE.indexOf(t))
  assert.ok(order.every((i) => i > 0), 'all four sections rendered')
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'architecture-first order')
  assert.ok(!/EcosystemLivingWorlds/.test(PAGE), 'EcosystemLivingWorlds no longer rendered on /ecosystem')
})

test('T-1 tier order: holdings, pillars, platform, experience-systems, products; Echo and WorldK equal peers', () => {
  const tiers = [...REL.matchAll(/data-tier="([a-z-]+)"/g)].map((m) => m[1])
  assert.deepEqual(tiers, ['holdings', 'pillars', 'platform', 'experience-systems', 'products'])
  assert.match(REL, /\{ key: 'echo', name: U\['AVK-U03-FX-10'\], line: E\['AVK-EW-03'\] \}/)
  assert.match(REL, /\{ key: 'worldk', name: C\['AVK-FR-055'\], line: E\['AVK-EW-04'\] \}/)
  // Both systems are rendered by the one SYSTEMS.map -> identical markup and heading level (parity).
  assert.equal((REL.match(/SYSTEMS\.map\(\(sys\)/g) ?? []).length, 1)
  assert.match(REL, /U\['AVK-U03-EV-43'\]/, 'Platform tier label is the approved EV-43')
  assert.match(REL, /E\['AVK-EW-01'\]/)
  assert.match(REL, /E\['AVK-EW-05'\]/)
  assert.match(REL, /E\['AVK-EW-02'\]/)
})

test('T-1 no arrow from the experience systems into products (only Holdings -> pillars -> Platform -> container)', () => {
  assert.equal((REL.match(/<Step \/>/g) ?? []).length, 3)
  const sys = REL.slice(REL.indexOf('data-tier="experience-systems"'), REL.indexOf('data-tier="products"'))
  assert.ok(!/<Step \/>|↓/.test(sys))
})

test('T-2 Level 2 stays conceptual: no links, no JSX literals, no product-to-pillar mapping, no EC-09', () => {
  assert.ok(!/<a\b|<Link\b|href=|DepartureLink/.test(REL))
  const literals = [...REL.matchAll(/(?<!=)>\s*([^<>{}\s()][^<>{}]*?)\s*</g)].map((m) => m[1]).filter((t) => t !== '↓')
  assert.deepEqual(literals, [])
  assert.ok(!/AVK-FLW-EC-09|PILLARS\.map\([^)]*product/i.test(REL))
})

test('T-3 no product appears in both the experience-systems tier and the products tier', () => {
  assert.match(REL, /\.filter\(\(id\) => !SYSTEM_IDS\.has\(id\)\)/)
  assert.ok(!/includesWorldK/.test(REL), 'WorldK chip not repeated in Level 2 products')
})

test('T-4 WorldK stays static and unlinked to any WorldK host; withheld copy absent', () => {
  for (const src of [REL, SYS]) {
    assert.ok(!/worldk\.ai|\/enter\b|getProductById\(['"]worldk/i.test(src))
    assert.ok(!/AVK-FLW-EC-08|AVK-FLW-EC-11|AVK-FLW-EC-03|Mahabharata|Research Center|Forest Intelligence/.test(src))
  }
  assert.match(SYS, /status=\{\{ text: L\['AVK-FLW-EC-06'\], tier: 'IN DEVELOPMENT' \}\}/, 'WorldK In development')
  // The only action in the systems section is the internal Living Worlds route.
  assert.deepEqual([...SYS.matchAll(/href: ([A-Z_]+)/g)].map((m) => m[1]), ['LIVING_WORLDS_HREF'])
  assert.ok(!/<a\b|DepartureLink|https?:/.test(SYS))
})

test('T-4 Echo and WorldK panels: same component, variants, ids and motifs', () => {
  assert.equal((SYS.match(/<ExperienceCard\b/g) ?? []).length, 2)
  assert.match(SYS, /id="echo"[\s\S]*variant="echo"[\s\S]*media=\{<EchoMotif \/>\}/)
  assert.match(SYS, /id="worldk"[\s\S]*variant="world"[\s\S]*media=\{<WorldWell \/>\}/)
  assert.match(SYS, /lg:grid-cols-2/)
})

// AVK-ECOSYSTEM-04-PREVIEW (E04-4) rebaseline: the only approved diagram change is removing the GameK -> ArenaK and
// Atlas -> ArenaK edges (plus their 3-line comment). Re-inserting exactly those must reproduce the 3f073a3 bytes,
// so every node, position, timing and the remaining edges stay pinned.
const E04_EDGES_COMMENT = DIAGRAM.slice(DIAGRAM.indexOf('// AVK-ECOSYSTEM-04-PREVIEW (E04-4): only PrometheusK'), DIAGRAM.indexOf('const EDGES:'))
const E04_REMOVED_EDGES = "  { from: 'gamek', to: 'arenak', stage: 'linesEnginesArena' },\n  { from: 'atlask', to: 'arenak', stage: 'linesEnginesArena' },\n"
const PK_ARENA_EDGE = "  { from: 'prometheusk', to: 'arenak', stage: 'linesEnginesArena' },\n"

test('T-5 journey diagram geometry, nodes, motion and markup are 3f073a3 minus exactly the two E04-4 edges', () => {
  const a = DIAGRAM.indexOf('const NODE_EMERGE_MS')
  const geometry = DIAGRAM.slice(a, DIAGRAM.indexOf('// AVK-ECOSYSTEM-WORLDK-02 (OD-EW-7)', a))
  assert.equal(E04_EDGES_COMMENT.split('\n').length - 1, 3, 'E04-4 comment is three lines')
  assert.equal((geometry.match(/stage: 'linesEnginesArena'/g) ?? []).length, 1, 'one edge into ArenaK')
  const restored = geometry.replace(E04_EDGES_COMMENT, '').replace(PK_ARENA_EDGE, PK_ARENA_EDGE + E04_REMOVED_EDGES)
  assert.equal(sha(restored), 'd3404147b994cdf82ad2dbddce69834fa16c48f57fc4419d0786108381a5a69b')
  assert.equal(sha(DIAGRAM.slice(DIAGRAM.indexOf('export function PlatformDiagram'))), '9af71d794525fa574392f1ff298b217ff1a7db546a62dd81ce004ac97a422c10')
  assert.match(DIAGRAM, /const DIAGRAM_ARIA_LABEL = G\['AVK-E04-EW-08'\]/)
  assert.equal((DIAGRAM.match(/aria-label=\{DIAGRAM_ARIA_LABEL\}/g) ?? []).length, 2, 'desktop and mobile SVG share the accessible name')
})

test('T-6 the Echo-rooted heading is gone; journey heading, caption and h2 eyebrows', () => {
  for (const f of [ARCH, PAGE, REL, SYS]) assert.ok(!/AvatarK → Echo/.test(f))
  assert.match(ARCH, /<h2[^>]*>\{E\['AVK-EW-06'\]\}<\/h2>/)
  assert.match(ARCH, /data-testid="journey-caption"[\s\S]*?\{E\['AVK-EW-07'\]\}/)
  assert.match(ARCH, /<h2 className="text-center text-xs[^"]*"[^>]*>\s*Growth Engines\s*<\/h2>/)
  assert.match(ARCH, /<h2 className="text-center text-xs[^"]*"[^>]*>\s*Expression Layer\s*<\/h2>/)
})

test('T-7 every EW string used on the page exists in the approved module', () => {
  const used = new Set([...[ARCH, REL, SYS, DIAGRAM].join('\n').matchAll(/E\['(AVK-EW-\d\d)'\]/g)].map((m) => m[1]))
  // AVK-ECOSYSTEM-04-PREVIEW (E04-4): EW-08 is superseded by AVK-E04-EW-08 and no longer rendered.
  assert.deepEqual([...used].sort(), Object.keys(ECOSYSTEM_WORLDK_COPY).filter((id) => id !== 'AVK-EW-08').sort(), 'the other seven approved strings used, no others')
})

test('T-8 Discover Echo targets the #echo panel', () => {
  assert.match(read('lib', 'content', 'links.ts'), /export const DISCOVER_ECHO_HREF = '\/ecosystem#echo'/)
  assert.match(SYS, /id="echo"/)
})

// AVK-ECOSYSTEM-04-PREVIEW (E04-5) rebaseline: the only approved change is the ArenaK audit row (comment + reclassified
// entry). Restoring the 3f073a3 row must reproduce the 3f073a3 bytes, so everything else stays pinned.
const E04_ARENAK_OLD_ROW = "  { id: 'arenak', url: 'https://arenak.ai', classification: 'VERIFIED_PUBLIC', basis: 'HTTPS 200 via www redirect; public landing, no auth wall; registry public / coming online' },\n"

test('T-9 product destination restrictions: 3f073a3 except the E04-5 ArenaK row; X-1 set', () => {
  const src = read('lib', 'release', 'productDestinations.ts')
  const a = src.indexOf('  // AVK-ECOSYSTEM-04-PREVIEW (E04-5)')
  const b = src.indexOf('\n', src.indexOf("{ id: 'arenak'", a)) + 1
  assert.ok(a > 0 && b > a)
  assert.equal(src.slice(a, b).split('\n').length - 1, 4, 'three comment lines + one row')
  assert.equal(sha(src.slice(0, a) + E04_ARENAK_OLD_ROW + src.slice(b)), 'bdb6adfd31ded7aae3153ece47f3f7cfe8bdcad99a30efac107be70b219e2fd5')
  assert.deepEqual([...SCOPE_I_CLICKABLE_PRODUCT_URLS.keys()].sort(), ['prometheusk', 'streamk'])
})

test('T-10 (02R) EC-10 inert pill and EC-09 sit inside the WorldK panel, below its action; Echo panel has neither', () => {
  const echo = SYS.slice(SYS.indexOf('id="echo"'), SYS.indexOf('id="worldk"'))
  const worldk = SYS.slice(SYS.indexOf('id="worldk"'), SYS.indexOf('</RevealOnView>'))
  assert.ok(!/footer=|AVK-FLW-EC-09|AVK-FLW-EC-10/.test(echo), 'Echo panel unchanged')
  assert.match(worldk, /action=\{\{ label: U\['AVK-U03-HN-08'\], href: LIVING_WORLDS_HREF \}\}[\s\S]*footer=\{[\s\S]*data-testid="living-forest-inert-pill"[\s\S]*\{L\['AVK-FLW-EC-10'\]\}[\s\S]*\{L\['AVK-FLW-EC-09'\]\}/)
  // The pill stays an inert <span>: no link element, no href, no handler anywhere in the footer.
  const footer = worldk.slice(worldk.indexOf('footer={'))
  assert.match(footer, /<span\s+data-testid="living-forest-inert-pill"/)
  assert.ok(!/<a\b|<Link\b|href|onClick|tabIndex|role=/.test(footer))
  // Nothing remains below the twin grid; each string is rendered exactly once.
  assert.equal(SYS.slice(SYS.indexOf('</RevealOnView>')).replace(/\s+/g, ''), '</RevealOnView></SectionContainer></section>)}')
  for (const id of ['AVK-FLW-EC-09', 'AVK-FLW-EC-10']) assert.equal(SYS.split(`L['${id}']`).length - 1, 1, id)
  // The shared card only gains an optional slot, rendered after the action; absent everywhere else.
  const card = read('components', 'foundation', 'sections', 'ExperienceCard.tsx')
  assert.match(card, /footer\?: React\.ReactNode/)
  assert.match(card, /\)\}\n\s+\{footer\}\n\s+<\/div>\n\s+<\/article>/)
  for (const f of [['components', 'foundation', 'sections', 'FeaturedExperiences.tsx'], ['components', 'foundation', 'livingWorlds', 'WorldGallery.tsx']]) assert.ok(!/footer=/.test(read(...f)), f.join('/'))
})
