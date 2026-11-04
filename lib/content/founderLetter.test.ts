import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseFoundationContent } from './markdown.ts'

// AVK-FOUNDER-LIVING-WORLDS-02: Founder Letter integrity.
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const raw = readFileSync(path.join(process.cwd(), 'content', 'foundation', 'founder-letter.md'), 'utf-8')
const letter = parseFoundationContent(raw)
const section = (h: string) => {
  const s = letter.sections.find((x) => x.heading === h)
  assert.ok(s, h)
  return s
}

// Raw chapter blocks, split exactly as AVK_FOUNDER_LIVING_WORLDS_01/evidence/FOUNDER-CHAPTER-HASHES.txt:
// the body after the frontmatter, split on "\n## ".
function rawChapters(source: string): string[] {
  const body = source.slice(source.indexOf('\n---\n', 4) + 5)
  return body.split('\n## ')
}

test('Chapters 1 and 2 are byte-identical to the FLW-01 baseline hashes', () => {
  const [ch1, ch2] = rawChapters(raw)
  assert.equal(sha(ch1), 'de6bbd3bd838fe17f6eb4e4775b06317fc8af56926fe843fbf8e75916a760268')
  assert.equal(sha(ch2), '5beb1e5c240b96bf9c180fcd4cf62183735b9cff3a2d3633f5520ccc1f74ade5')
})

test('frontmatter is unchanged', () => {
  assert.equal(sha(raw.slice(0, raw.indexOf('\n---\n', 4) + 5)), 'af5f69b38d1db8bb9814a2134b4c303c82400b9363d6176be6afb4540a3c00e2')
})

const APPROVED: Record<string, string> = {
  'AVK-FLW-FL-301-ALT': '2534d74f09799cf427eab5cad4f1cd7a3ac1e4f7c4ebc63105503b49c67b65ac',
  'AVK-FLW-FL-401': 'a43f860116681362c882bd800799e2af337b758a7ef00ac85c0783c584537db7',
  'AVK-FLW-FL-402': '33b6bf87733a64542d7855df5a9744d1fcba7ac0ade9bb9941bb4fc8a10afeb2',
  'AVK-FLW-FL-403': '5c79ec9e062b907085590975eb2a10b44b189c9e87afc6c8215f0b33d71c9fd9',
  'AVK-FLW-FL-404': '97720c0414746259a2b88811530449bc86e4293cd0e3023b4da9588af2e1f9a6',
  'AVK-FLW-FL-405': 'a36c104aec52736f4d297d82e0246b848691eb52cc2efdc64c984067cf37cf1a',
  'AVK-FLW-FL-407': '5e2f30c5c9a307740f414d29529adf4edfde846432e8a34d4819f6b09ae8435c',
  'AVK-FLW-FL-408': '70de0bef09794535ee07a2683c41602f45a850afabf38c6ec9216f7bd6a54866',
}
const shaToId = new Map(Object.entries(APPROVED).map(([id, h]) => [h, id]))

// Base (cc54874) chapter paragraphs, as parsed, pinned by SHA-256 of JSON.stringify(paragraphs).
const BASE_SYNTHESIS_SHA = '0bbe2d185dc64d643b88d8f9b77ec8bd3866d93b160bcd7fa802c8e34435e7a2'

test('Chapter 3 keeps every existing paragraph and ends with FL-301-ALT', () => {
  const p = section('Synthesis').paragraphs
  assert.equal(p.length, 7)
  assert.equal(shaToId.get(sha(p[6])), 'AVK-FLW-FL-301-ALT')
  assert.equal(sha(JSON.stringify(p.slice(0, 6))), BASE_SYNTHESIS_SHA)
  assert.deepEqual(section('Synthesis').subheadings, [])
})

test('Chapter 4 inserts "Why Living Worlds?" between the inheritance paragraph and the closing', () => {
  const future = section('Future')
  const p = future.paragraphs
  assert.equal(p.length, 17 + 6)
  assert.deepEqual(future.subheadings, [{ beforeParagraph: 15, text: 'Why Living Worlds?', id: 'why-living-worlds' }])
  assert.equal(sha(future.subheadings?.[0].text ?? ''), APPROVED['AVK-FLW-FL-401'])
  assert.ok(p[14].startsWith('A life becomes an experience the moment it is lived with attention.'))
  const inserted = p.slice(15, 21).map((x) => shaToId.get(sha(x)))
  assert.deepEqual(inserted, [
    'AVK-FLW-FL-402', 'AVK-FLW-FL-403', 'AVK-FLW-FL-404', 'AVK-FLW-FL-405', 'AVK-FLW-FL-407', 'AVK-FLW-FL-408',
  ])
  assert.ok(p[21].startsWith('That is the journey AvatarK invites you to begin'))
  assert.equal(p[22], 'And to leave an Echo worth carrying forward.')
  assert.deepEqual(future.pullQuotes, [22])
})

test('Chapter 4 minus the approved insertion equals the base chapter', () => {
  const base = section('Future').paragraphs.filter((x) => !shaToId.has(sha(x)))
  assert.equal(base.length, 17)
  assert.equal(sha(JSON.stringify(base)), 'f5a4a06b18675d8bacc45eb5f8c789454b079d6c0356383824191398edd6734b')
})

test('the public letter withholds WorldK-canon-conditional wording and omitted rows', () => {
  for (const bad of [
    'Mahabharata', 'Research Center', 'Forest Intelligence', 'contemporary gateway', 'The first of these is Living Forest',
    'Human experience → Reflection → Practice → Evidence → Memory', 'the newest of them',
  ]) {
    assert.ok(!raw.includes(bad), bad)
  }
})

test('the four chapters keep their structure', () => {
  assert.deepEqual(letter.sections.map((s) => s.heading), ['Question', 'Synthesis', 'Future'])
  assert.equal(letter.intro.length, 9)
  assert.equal(section('Question').paragraphs.length, 6)
  assert.deepEqual(section('Question').pullQuotes, [5])
})
