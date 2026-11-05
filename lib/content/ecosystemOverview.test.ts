import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ECOSYSTEM_OVERVIEW_GROUPS } from './ecosystemOverview.ts'
import { UNIFICATION_COPY } from './unificationCopy.ts'
import { FOUNDER_SCIENCE_COPY } from './founderScienceCopy.ts'

const registrySrc = readFileSync(path.join(process.cwd(), 'packages', 'product-registry', 'src', 'registry.ts'), 'utf-8')

test('three explanatory groups in order: Experiences, Making, Knowledge and Intelligence', () => {
  assert.deepEqual(ECOSYSTEM_OVERVIEW_GROUPS.map((g) => UNIFICATION_COPY[g.labelId]), ['Experiences', 'Making', 'Knowledge and Intelligence'])
  assert.ok(!ECOSYSTEM_OVERVIEW_GROUPS.some((g) => (UNIFICATION_COPY[g.labelId] as string) === 'Creation'))
})

test('Canon axis "Creation" is preserved and is not an Ecosystem group label', () => {
  // AVK-FS-CI-40 is rendered from canon.md; the Canon reading module still carries the Creation reading.
  assert.ok(FOUNDER_SCIENCE_COPY['AVK-FS-CI-41'].length > 0)
  assert.match(readFileSync(path.join(process.cwd(), 'content', 'foundation', 'canon.md'), 'utf-8'), /^## Creation$/m)
})

test('every grouped product id exists in the product registry (Echo is the documented special case); WorldK only as the static chip', () => {
  for (const g of ECOSYSTEM_OVERVIEW_GROUPS) {
    for (const id of g.productIds) {
      if (id === 'echo') continue
      assert.match(registrySrc, new RegExp(`id: '${id}'`), id)
    }
    assert.ok(!g.productIds.includes('worldk'))
  }
  assert.deepEqual(ECOSYSTEM_OVERVIEW_GROUPS.filter((g) => g.includesWorldK).map((g) => g.key), ['experiences'])
  const all = ECOSYSTEM_OVERVIEW_GROUPS.flatMap((g) => g.productIds)
  assert.equal(new Set(all).size, all.length, 'no product in two groups')
})

test('Level 1 component adds no links (no new external product links)', () => {
  const src = readFileSync(path.join(process.cwd(), 'components', 'ecosystem', 'EcosystemOverview.tsx'), 'utf-8').replace(/\/\/.*$/gm, '')
  assert.ok(!/<a\b|<Link\b|href=|DepartureLink/.test(src))
})
