import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ECOSYSTEM_WORLDK_COPY, ECOSYSTEM_WORLDK_COPY_SHA256, type EcosystemWorldkCopyId } from './ecosystemWorldkCopy.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// AVK-ECOSYSTEM-WORLDK-02 ew-register.json sha256 values (OD-EW-2, 2026-11-07), pinned here independently of
// the generated module so an edit to both a string and its local hash still fails.
const REGISTER_SHA256: Record<string, string> = {
  'AVK-EW-01': '435e76b981d4653a76c5bc1b82e103e73afa7ba1323dfaad5ecf7ef228fb237a',
  'AVK-EW-02': '2eb2635fc1be8aa18f7a804fb613b384922c85f719662b8d5c188442338c17b6',
  'AVK-EW-03': '41d7ae6daa7b23de41c553762b1a021196dbdbb3a22eacd8cb04f2e175dce8d3',
  'AVK-EW-04': '774d817012c5ba2994fec54b412ca56a7aea81f8a181f06c4d9db6eef08ac57f',
  'AVK-EW-05': '4edc8bfafc6bd936b849f38c009454eac0febc8982f990e734724156584d56f9',
  'AVK-EW-06': '83381723868eb24a4d1b2b76252c1ca891d615fe689e0a1f78fb8522d599c9dc',
  'AVK-EW-07': '035ef242b70dbf72300d2a765f8a6b33450230d4aafaaa9bbd9d7c34b15dc521',
  'AVK-EW-08': '24a556260031a56a502796ef4caef70b7ba5504d32e6e0f7ec20efa603c327ab',
}

// Withheld strings (never in this module): AVK-FLW-EC-08 (OD-EW-4), AVK-FLW-EC-11 (OD-12).
const WITHHELD_SHA256 = new Set([
  'cc0b6041fa7b5a82122db99e4d9feda490c92c4a5f3dff7a87be6e74e490677b', // AVK-FLW-EC-08
  'ce54bb4143f9b49d592c437f16669bd1f3074ee3f807b80aee2c012be632eaf6', // AVK-FLW-EC-11
])

test('EW-01..08: exactly the eight approved IDs, each matching its register SHA-256', () => {
  const ids = Object.keys(ECOSYSTEM_WORLDK_COPY) as EcosystemWorldkCopyId[]
  assert.deepEqual([...ids].sort(), Object.keys(REGISTER_SHA256).sort())
  for (const id of ids) {
    assert.equal(sha(ECOSYSTEM_WORLDK_COPY[id]), REGISTER_SHA256[id], id)
    assert.equal(ECOSYSTEM_WORLDK_COPY_SHA256[id], REGISTER_SHA256[id], id)
  }
})

test('EW copy: headings exact; no withheld relationship copy; no positional or WorldK-host wording', () => {
  assert.equal(ECOSYSTEM_WORLDK_COPY['AVK-EW-06'], 'One journey through the platform')
  assert.equal(ECOSYSTEM_WORLDK_COPY['AVK-EW-01'], 'Experience systems')
  for (const v of Object.values(ECOSYSTEM_WORLDK_COPY)) {
    const h = sha(v)
    assert.ok(!WITHHELD_SHA256.has(h), v)
    assert.ok(!/StudioK|worldk\.ai|\babove\b|\bbelow\b|open to visitors|Mahabharata|Research Center/i.test(v), v)
  }
})
