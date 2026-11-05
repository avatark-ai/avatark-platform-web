import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { FUTURE_WORLD_CONCEPTS, FUTURE_WORLD_LABEL_ID } from './livingWorldsGallery.ts'
import { UNIFICATION_COPY } from './unificationCopy.ts'

const root = process.cwd()
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf-8')
const pageFiles = [
  read('app', 'living-worlds', 'page.tsx'),
  ...readdirSync(path.join(root, 'components', 'foundation', 'livingWorlds')).map((f) => read('components', 'foundation', 'livingWorlds', f)),
]

test('gallery: three concepts in owner order, titles + "Future concept" only', () => {
  assert.deepEqual(FUTURE_WORLD_CONCEPTS.map((w) => w.key), ['living-vrindavan', 'living-sea', 'living-forge'])
  assert.deepEqual(FUTURE_WORLD_CONCEPTS.map((w) => UNIFICATION_COPY[w.titleId]), ['Living Vrindavan', 'Living Sea', 'Living Forge'])
  assert.equal(UNIFICATION_COPY[FUTURE_WORLD_LABEL_ID], 'Future concept')
  for (const w of FUTURE_WORLD_CONCEPTS) {
    assert.ok(!('href' in w), `${w.key} has no href`)
    assert.equal(w.descriptionId, undefined, `${w.key}: descriptions are pending (D-U03-08)`)
    assert.equal(w.media, undefined, `${w.key}: no cleared media`)
  }
})

test('/living-worlds source: no WorldK/entry link, no Mahabharata, no FD-04/FD-05, no images', () => {
  // Code only: comments document the boundaries (e.g. "no VANAM imagery") and must not trip the scan.
  const src = pageFiles.join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!/href=["'`{][^\n]*(worldk|\/enter|\/worlds\/|https?:)/i.test(src))
  assert.ok(!/Mahabharata/i.test(src))
  assert.ok(!src.includes("'AVK-FLW-FD-04'") && !src.includes("'AVK-FLW-FD-05'"))
  assert.ok(!/<img|<Image|next\/image|vanam/i.test(src))
})
