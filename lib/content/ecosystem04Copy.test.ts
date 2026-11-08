// AVK-ECOSYSTEM-04: Growth Engines correction + StudioK card guards (source-level; runs in a git-less export).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ECOSYSTEM_04_COPY, ECOSYSTEM_04_COPY_SHA256, FOURTH_GROWTH_ENGINE_ID, INTELLIGENCE_SECTION_HEADING, STUDIOK_CAPABILITY_CHIPS, splitRelationTokens, type Ecosystem04CopyId } from './ecosystem04Copy.ts'
import { SCOPE_I_CLICKABLE_PRODUCT_URLS, scopeIProductHref } from '../release/productDestinations.ts'
import { PRODUCT_REGISTRY } from '../../packages/product-registry/src/registry.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const read = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), 'utf-8')
const code = (...p: string[]) => read(...p).replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

// e04-register.json values, pinned independently of the module.
const REGISTER_SHA256: Record<string, string> = {
  'AVK-E04-SK-01': '775e866ec3bb558a3f486bf19c5b151a07dade8db0303760c6aa94c51b1ba1f9',
  'AVK-E04-SK-02': '03987fbbd4fa5f5fb13f575932604c87cf98cdfaff3ba69432fd7469dcc5dadb',
  'AVK-E04-SK-03': 'f6e62460229968ee5abf7465dab840ccaee13fb5f42f7ef9816121663aff4bfa',
  'AVK-E04-PK-REL': '6d6415fbe7c7b82bc06a92a8f96ecb1c58d5c091018d1a0efe60b61a34991b44',
  'AVK-E04-EW-08': '9fe212f2d6a9e431b9c4658a72add7ba86732ed5999e103b57c0207c0040b439',
}

const ARCH = code('components', 'ecosystem', 'PlatformArchitecture.tsx')
const CARD = code('components', 'ecosystem', 'GrowthEngineCard.tsx')
const CYJ = code('components', 'ecosystem', 'ContinueYourJourney.tsx')
const DIAGRAM = read('components', 'ecosystem', 'PlatformDiagram.tsx')

test('E04-1 copy: exactly the five register IDs (r1), each matching its SHA-256', () => {
  const ids = Object.keys(ECOSYSTEM_04_COPY) as Ecosystem04CopyId[]
  assert.deepEqual([...ids].sort(), Object.keys(REGISTER_SHA256).sort())
  for (const id of ids) {
    assert.equal(sha(ECOSYSTEM_04_COPY[id]), REGISTER_SHA256[id], id)
    assert.equal(ECOSYSTEM_04_COPY_SHA256[id], REGISTER_SHA256[id], id)
  }
})

test('E04-2 no generic continuation claim on Growth Engine cards', () => {
  assert.ok(!/Continues to/.test(CARD), 'card no longer renders "Continues to"')
  assert.ok(!/nextProducts|getJourneyTransitions/.test(ARCH), 'engine cards no longer derive a next product')
  for (const [id, v] of Object.entries(ECOSYSTEM_04_COPY)) if (id !== 'AVK-E04-EW-08') assert.ok(!/continues? (in)?to/i.test(v), v)
})

test('E04-3 only PrometheusK and StudioK carry a relation line; GameK and Atlas have none', () => {
  const relIds = [...ARCH.matchAll(/relationId: '([A-Z0-9-]+)'/g)].map((m) => m[1])
  assert.deepEqual(relIds.sort(), ['AVK-E04-PK-REL', 'AVK-E04-SK-03'])
  const gamek = ARCH.slice(ARCH.indexOf('gamek: {'), ARCH.indexOf('atlas: {'))
  const atlas = ARCH.slice(ARCH.indexOf('atlas: {'), ARCH.indexOf('}', ARCH.indexOf('fallbackFeatures', ARCH.indexOf('atlas: {'))))
  assert.ok(!/relationId/.test(gamek) && !/relationId/.test(atlas))
})

test('E04-4 relation tokens resolve to real registry products and obey the Scope I destination policy', () => {
  for (const v of Object.values(ECOSYSTEM_04_COPY)) {
    for (const part of splitRelationTokens(v)) {
      if ('productId' in part) {
        const p = PRODUCT_REGISTRY.find((x) => x.id === part.productId)
        assert.ok(p, `token {${part.productId}} is a registry product`)
        assert.equal(scopeIProductHref(part.productId, p!.domain, 'institutional'), SCOPE_I_CLICKABLE_PRODUCT_URLS.get(part.productId) === p!.domain ? p!.domain : null)
      }
    }
  }
  assert.deepEqual(splitRelationTokens('{arenak} x.'), [{ productId: 'arenak' }, { text: ' x.' }])
  assert.deepEqual(splitRelationTokens('plain'), [{ text: 'plain' }])
})

test('E04-5 StudioK: fourth Growth Engine card, non-clickable, registry unchanged, not duplicated', () => {
  assert.match(ARCH, /descriptor: G\['AVK-E04-SK-01'\]/)
  assert.match(ARCH, /description: G\['AVK-E04-SK-02'\]/)
  assert.equal(scopeIProductHref('studiok', 'https://studiok.dt4m.ai', 'institutional'), null)
  assert.equal(SCOPE_I_CLICKABLE_PRODUCT_URLS.has('studiok'), false)
  const studiok = PRODUCT_REGISTRY.find((p) => p.id === 'studiok')!
  assert.equal(studiok.journeyRole, undefined, 'StudioK stays off the Echo journey graph')
  assert.ok(!/studiok:/.test(ARCH.slice(ARCH.indexOf('INTELLIGENCE_COPY'))), 'StudioK not in the Intelligence section')
  assert.equal(FOURTH_GROWTH_ENGINE_ID, 'studiok')
  assert.match(ARCH, /id: FOURTH_GROWTH_ENGINE_ID,/)
  assert.deepEqual([...STUDIOK_CAPABILITY_CHIPS], ['World Construction', 'Procedural Generation', 'Simulation', 'Cinematic Production'])
})

test('E04-6 responsive grid: 1 / 2 (sm) / 4 (xl) columns', () => {
  assert.match(ARCH, /grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4/)
  assert.ok(!/lg:grid-cols-3/.test(ARCH))
  // E04-7: badge always on its own row under the descriptor (no side-by-side variant left).
  assert.match(CARD, /<div className="flex flex-col items-start gap-1\.5">\s*<p className="text-xs font-semibold uppercase tracking-wider"[^>]*>\s*\{descriptor\}\s*<\/p>\s*<StatusBadge status=\{status\} \/>\s*<\/div>/)
  assert.ok(!/justify-between/.test(CARD), 'no side-by-side header variant')
})

test('E04-7 registry journey edges: only PrometheusK continues into ArenaK; diagram edges match the registry', () => {
  const next = (id: string) => PRODUCT_REGISTRY.find((p) => p.id === id)!.nextProductIds
  assert.deepEqual(next('prometheusk'), ['arenak'])
  assert.deepEqual(next('gamek'), [])
  assert.deepEqual(next('atlas'), [])
  assert.deepEqual(next('arenak'), ['streamk'])
  assert.deepEqual(next('streamk'), ['cinemak'])
  const edges = [...DIAGRAM.matchAll(/\{ from: '([a-z]+)', to: '([a-z]+)'/g)].map((m) => `${m[1]}->${m[2]}`)
  assert.deepEqual(edges.filter((e) => e.endsWith('->arenak')), ['prometheusk->arenak'])
  assert.ok(!edges.some((e) => /studiok/.test(e)), 'no StudioK edge introduced')
})

// ---- AVK-ECOSYSTEM-04-PREVIEW: the seven approved presentation decisions ----

test('PV-E04-3 Creator & Intelligence renamed Intelligence; SetpointK only', () => {
  assert.equal(INTELLIGENCE_SECTION_HEADING, 'Intelligence')
  assert.match(ARCH, />\s*\{INTELLIGENCE_SECTION_HEADING\}\s*<\/h2>/)
  assert.ok(!/Creator/.test(ARCH), 'no "Creator" heading left')
  assert.match(ARCH, /const INTELLIGENCE_COPY[^=]*= \{\s*setpointk: \{[^}]*\},\s*\}/)
})

test('PV-E04-4 EW-08 amendment: four engines, only practice continues into ArenaK, not an integration map', () => {
  const t = ECOSYSTEM_04_COPY['AVK-E04-EW-08']
  assert.match(t, /four Growth Engines/)
  for (const p of ['PrometheusK', 'GameK', 'Atlas', 'StudioK', 'ArenaK']) assert.ok(t.includes(p), p)
  assert.ok(!/Each can continue/.test(t) && !/onto three Growth Engines/.test(t), 'old claims gone')
  assert.match(t, /From practice, a journey can continue into ArenaK/)
  assert.match(t, /not an ownership chart or a map of product integrations/)
  // Continue Your Journey: four-engine choice, StudioK appended for presentation, source named on engine steps.
  assert.match(CYJ, /FOURTH_GROWTH_ENGINE_ID/)
  assert.match(CYJ, /data-testid="journey-source"[\s\S]*?From \{engineSource\.name\}/)
  assert.ok(!/Continues to/.test(CYJ))
})

test('PV-E04-6 StudioK card shows one maturity indicator (badge only)', () => {
  const studiokCard = ARCH.slice(ARCH.indexOf('getPlatformNode(STUDIOK_ENGINE.id)'))
  assert.match(studiokCard.slice(0, studiokCard.indexOf('/>')), /maturityLabel=\{null\}/)
})
