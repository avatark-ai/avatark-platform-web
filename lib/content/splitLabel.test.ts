import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { splitLabel } from './splitLabel.ts'
import { LIVING_WORLDS_COPY } from './livingWorldsCopy.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

test('D-U03-11: Stories heading + intro are the approved words of AVK-FLW-LW-15-R, unchanged', () => {
  const s = splitLabel(LIVING_WORLDS_COPY['AVK-FLW-LW-15-R'])
  assert.ok(s)
  // u03d-register.json AVK-U03-LW-15-R-H / -L
  assert.equal(sha(s.label), 'a3a63581747904d3c30f3d594b24f9d2d7d2283d306d280f8ec906b70a55f534')
  assert.equal(sha(s.rest), 'aefa4f755578c7eb54a677171f4709c5935762c69290123d5831596d4d23f119')
  assert.equal(`${s.label}: ${s.rest}`, LIVING_WORLDS_COPY['AVK-FLW-LW-15-R'])
  assert.equal(splitLabel('no label here'), null)
})
