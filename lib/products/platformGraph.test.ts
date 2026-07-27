import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPlatformNode, getGrowthEngines, getExpressionLayer, getConvergenceLayer, getJourneyTransitions, distinctMaturityLabel } from './platformGraph.ts'

test('getPlatformNode resolves the synthetic Echo node', () => {
  const echo = getPlatformNode('echo')
  assert.equal(echo?.id, 'echo')
  assert.equal(echo?.name, 'Echo')
  assert.ok(echo?.href)
})

test('getPlatformNode resolves a real registry product', () => {
  const prometheusk = getPlatformNode('prometheusk')
  assert.equal(prometheusk?.name, 'PrometheusK')
  assert.equal(prometheusk?.status, 'LIVE')
})

test('getPlatformNode returns null for an unknown id', () => {
  assert.equal(getPlatformNode('not-a-product'), null)
})

test('getGrowthEngines returns PrometheusK, GameK, AtlasK in journeyOrder', () => {
  const engines = getGrowthEngines()
  assert.deepEqual(
    engines.map((e) => e.id),
    ['prometheusk', 'gamek', 'atlas']
  )
})

test('RC4: the atlas product keeps the registry\'s own "Atlas" displayName, not a narrative rename', () => {
  const atlas = getGrowthEngines().find((e) => e.id === 'atlas')
  assert.equal(atlas?.name, 'Atlas')
})

test('distinctMaturityLabel hides the maturity label when it repeats the integration-status badge word', () => {
  const prometheusk = getPlatformNode('prometheusk')
  assert.equal(prometheusk?.status, 'LIVE')
  assert.equal(prometheusk?.maturityLabel, 'Live')
  assert.equal(distinctMaturityLabel(prometheusk!), null)
})

test('distinctMaturityLabel surfaces the maturity label when it diverges from the integration-status badge', () => {
  const gamek = getPlatformNode('gamek')
  assert.equal(gamek?.status, 'LIVE')
  assert.equal(gamek?.maturityLabel, 'Beta')
  assert.equal(distinctMaturityLabel(gamek!), 'Beta')
})

test('GameK carries its learning experiences', () => {
  const gamek = getGrowthEngines().find((e) => e.id === 'gamek')
  assert.deepEqual(
    gamek?.experiences.map((e) => e.name),
    ['FlowK', 'PathK', 'GeometriK', 'ChronicleK']
  )
})

test('getConvergenceLayer returns ArenaK', () => {
  assert.deepEqual(
    getConvergenceLayer().map((n) => n.id),
    ['arenak']
  )
})

test('getExpressionLayer returns StreamK then CinemaK', () => {
  assert.deepEqual(
    getExpressionLayer().map((n) => n.id),
    ['streamk', 'cinemak']
  )
})

test('getJourneyTransitions collapses Echo fan-out into one transition', () => {
  const transitions = getJourneyTransitions()
  const echoTransition = transitions.find((t) => t.sources.some((s) => s.id === 'echo'))
  assert.ok(echoTransition)
  assert.deepEqual(
    echoTransition.targets.map((t) => t.id).sort(),
    ['atlas', 'gamek', 'prometheusk']
  )
})

test('getJourneyTransitions collapses the three Growth Engines converging on ArenaK', () => {
  const transitions = getJourneyTransitions()
  const arenaTransition = transitions.find((t) => t.targets.some((tg) => tg.id === 'arenak'))
  assert.ok(arenaTransition)
  assert.deepEqual(
    arenaTransition.sources.map((s) => s.id).sort(),
    ['atlas', 'gamek', 'prometheusk']
  )
})

test('getJourneyTransitions produces simple 1:1 transitions for ArenaK->StreamK and StreamK->CinemaK', () => {
  const transitions = getJourneyTransitions()
  const arenaToStream = transitions.find((t) => t.sources.length === 1 && t.sources[0].id === 'arenak')
  const streamToCinema = transitions.find((t) => t.sources.length === 1 && t.sources[0].id === 'streamk')
  assert.deepEqual(arenaToStream?.targets.map((t) => t.id), ['streamk'])
  assert.deepEqual(streamToCinema?.targets.map((t) => t.id), ['cinemak'])
})

test('getJourneyTransitions has no transition originating from CinemaK (terminal node)', () => {
  const transitions = getJourneyTransitions()
  assert.equal(
    transitions.some((t) => t.sources.some((s) => s.id === 'cinemak')),
    false
  )
})

test('getJourneyTransitions produces exactly 4 transitions for the current graph', () => {
  assert.equal(getJourneyTransitions().length, 4)
})
