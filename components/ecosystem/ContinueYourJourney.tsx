import Link from 'next/link'
import { DepartureLink } from '@/components/motion/DepartureLink'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { getJourneyTransitions } from '@/lib/products/platformGraph'

// RC3: recommendations are now computed from the platform journey graph
// (lib/products/platformGraph.ts) instead of three hardcoded prompts --
// each card is a real transition in that graph (Echo's fan-out into the
// Growth Engines, the Growth Engines converging on ArenaK, ArenaK -> StreamK,
// StreamK -> CinemaK), so this list changes automatically as the registry's
// journeyRole/nextProductIds graph changes, with no edits needed here.
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} or ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`
}

export function ContinueYourJourney() {
  const transitions = getJourneyTransitions()

  return (
    <RevealOnView className="motion-emerge-stagger flex flex-col items-center gap-6">
      {transitions.map((transition) => {
        const sourceLabel = joinNames(transition.sources.map((s) => s.name))
        const key = `${transition.sources.map((s) => s.id).join('+')}->${transition.targets.map((t) => t.id).join('+')}`

        return (
          <div key={key} className="flex flex-col items-center gap-2 text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--ink)' }}>
              {sourceLabel}
            </p>
            <span aria-hidden="true" className="text-xl" style={{ color: 'var(--gold)' }}>
              ↓
            </span>
            <p className="text-base font-semibold">
              {transition.targets.map((target, index) => {
                const external = target.href?.startsWith('http') ?? false
                return (
                  <span key={target.id}>
                    {index > 0 && (index === transition.targets.length - 1 ? ', or ' : ', ')}
                    {target.href ? (
                      external ? (
                        <DepartureLink
                          href={target.href}
                          className="link-underline-draw rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                        >
                          {target.name}
                        </DepartureLink>
                      ) : (
                        <Link
                          href={target.href}
                          className="link-underline-draw rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                        >
                          {target.name}
                        </Link>
                      )
                    ) : (
                      <span style={{ color: 'var(--ink-dim)' }}>{target.name}</span>
                    )}
                  </span>
                )
              })}
            </p>
          </div>
        )
      })}
    </RevealOnView>
  )
}
