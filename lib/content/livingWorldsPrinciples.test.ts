import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIVING_WORLD_PRINCIPLES, PRINCIPLES_HEADING_ID, PRINCIPLES_INTRO_ID } from './livingWorldsPrinciples.ts'
import { UNIFICATION_COPY } from './unificationCopy.ts'

test('six principles, owner order and names; heading and mandatory intro', () => {
  assert.deepEqual(LIVING_WORLD_PRINCIPLES.map((p) => UNIFICATION_COPY[p.nameId]), ['Place', 'Memory', 'Change', 'Return', 'Discovery', 'Participation'])
  assert.equal(UNIFICATION_COPY[PRINCIPLES_HEADING_ID], 'What makes a world living?')
  assert.match(UNIFICATION_COPY[PRINCIPLES_INTRO_ID], /not features available to visitors today\.$/)
  assert.deepEqual(LIVING_WORLD_PRINCIPLES.map((p) => p.bodyId), ['AVK-U03-LW-13-R', 'AVK-U03-LW-15-R', 'AVK-U03-LW-17-R', 'AVK-U03-LW-19-R', 'AVK-U03-LW-21-R', 'AVK-U03-LW-23-R'])
})

test('principle bodies never claim public operation (wording guard)', () => {
  for (const p of LIVING_WORLD_PRINCIPLES) {
    const body = UNIFICATION_COPY[p.bodyId]
    assert.ok(!/\b(you can|now|live|available|open(s|ed)? to)\b/i.test(body), `${p.key}: ${body}`)
  }
})
