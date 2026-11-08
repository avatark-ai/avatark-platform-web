import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DT4H_SETPOINT_COPY, DT4H_SETPOINT_COPY_SHA256, type Dt4hSetpointCopyId } from './dt4hSetpointCopy.ts'
import { APPROVED_COPY } from './institutionalCopy.ts'

// AVK-DT4H-SETPOINT-01: DT4H = Digital Twin for Health (modeling); SetpointK = SETPOINT execution and adaptation.
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const ARCH = read('../../components/ecosystem/PlatformArchitecture.tsx')
const BAND = read('../../components/foundation/sections/PillarsBand.tsx')

test('DS-0 every DT4H/SetpointK string matches its pinned SHA-256', () => {
  for (const id of Object.keys(DT4H_SETPOINT_COPY) as Dt4hSetpointCopyId[]) assert.equal(sha(DT4H_SETPOINT_COPY[id]), DT4H_SETPOINT_COPY_SHA256[id], id)
  assert.deepEqual(Object.keys(DT4H_SETPOINT_COPY).sort(), ['AVK-DS-SEC-01', 'AVK-DS-SP-01', 'AVK-DS-SP-02', 'AVK-DS-SP-03'])
})

test('DS-1 DT4H expands to Digital Twin for Health; the wrong expansion is gone', () => {
  assert.equal(APPROVED_COPY['AVK-FR-033'], 'DT4H')
  assert.equal(APPROVED_COPY['AVK-FR-034-A'], 'Digital Twin for Health')
  assert.equal(APPROVED_COPY['AVK-FR-035-A'], 'Modeling, calibration and human digital-twin intelligence.')
  const all = Object.values(APPROVED_COPY).join('\n')
  assert.ok(!all.includes('Digital Transformation for Humanity'))
  assert.ok(!/four pillars of digital transformation/i.test(all), 'band intro no longer calls DT4H "digital transformation"')
  assert.match(BAND, /C\['AVK-FR-034-A'\], line: C\['AVK-FR-035-A'\]/)
  assert.match(BAND, /\{C\['AVK-FR-032-A'\]\}/)
})

test('DS-2 the other three pillars are unchanged', () => {
  assert.equal(APPROVED_COPY['AVK-FR-037'], 'Digital Transformation for Industry')
  assert.equal(APPROVED_COPY['AVK-FR-040'], 'Digital Transformation for Media')
  assert.equal(APPROVED_COPY['AVK-FR-043'], 'Digital Transformation for Civilization')
})

test('DS-3 the SetpointK card presents execution/adaptation built on DT4H, not DT4H modeling', () => {
  const block = ARCH.slice(ARCH.indexOf('const INTELLIGENCE_COPY'), ARCH.indexOf('function getIntelligenceNodes'))
  assert.match(block, /descriptor: D\['AVK-DS-SP-01'\], description: D\['AVK-DS-SP-02'\], relation: D\['AVK-DS-SP-03'\]/)
  assert.ok(!block.includes('Intelligence Layer'))
  assert.match(ARCH, /description=\{copy\.description\}/)
  assert.ok(!/description=\{node\.purpose/.test(ARCH.slice(ARCH.indexOf('getIntelligenceNodes().map'))), 'registry tagline no longer rendered on the SetpointK card')
  for (const v of [DT4H_SETPOINT_COPY['AVK-DS-SP-01'], DT4H_SETPOINT_COPY['AVK-DS-SP-02']]) assert.ok(!/digital[- ]twin|model(ing)? layer|calibrat/i.test(v), 'SetpointK copy claims no modeling: ' + v)
  assert.equal(DT4H_SETPOINT_COPY['AVK-DS-SP-03'], 'Built on DT4H, Digital Twin for Health.')
})

test('DS-4 no new integration or link claim', () => {
  const all = Object.values(DT4H_SETPOINT_COPY).join('\n')
  for (const bad of ['http', 'integrat', 'connected', 'sync', 'AvatarK Platform', '{']) assert.ok(!all.includes(bad), bad)
})
