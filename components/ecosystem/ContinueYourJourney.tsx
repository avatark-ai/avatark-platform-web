import Link from 'next/link'
import { DepartureLink } from '@/components/motion/DepartureLink'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { getPlatformNode, getJourneyTransitions } from '@/lib/products/platformGraph'

// RC4 final polish: still fully computed from the platform journey graph
// (lib/products/platformGraph.ts) -- same getJourneyTransitions() RC3
// introduced, nothing about the graph/registry changed here. What changed
// is only how each transition is *worded*: previously this echoed the
// diagram above it verbatim ("Echo ↓ PrometheusK, GameK, or Atlas"), which
// told a visitor nothing they hadn't already seen. Now each transition gets
// an action verb instead of an arrow, so this section answers "what do I
// actually do next" rather than repeating "what connects to what."
// ACTION_COPY is keyed by the transition's single target id when there is
// one; a transition with several targets (today, only Echo's fan-out into
// the three Growth Engines) always reads as a choice, regardless of which
// or how many products are in that set -- so a future fourth Growth Engine
// needs no copy change here.
const ACTION_COPY: Record<string, string> = {
  arenak: 'Join the Community',
  streamk: 'Share Stories',
  cinemak: 'Preserve Knowledge',
}
const CHOICE_ACTION = 'Choose Your Growth Engine'

function TargetLink({ name, href }: { name: string; href: string | null }) {
  const external = href?.startsWith('http') ?? false
  if (!href) return <span style={{ color: 'var(--ink-dim)' }}>{name}</span>
  const linkProps = {
    href,
    className: 'link-underline-draw rounded-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    style: { color: 'var(--ink)', outlineColor: 'var(--gold)' },
  }
  return external ? <DepartureLink {...linkProps}>{name}</DepartureLink> : <Link {...linkProps}>{name}</Link>
}

export function ContinueYourJourney() {
  const echo = getPlatformNode('echo')
  const transitions = getJourneyTransitions()

  return (
    <RevealOnView className="motion-emerge-stagger flex flex-col items-center gap-6">
      {echo?.href && (
        <div className="flex flex-col items-center text-center">
          <Link
            href={echo.href}
            className="link-underline-draw rounded-sm text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
          >
            Start with Echo →
          </Link>
        </div>
      )}

      {transitions.map((transition) => {
        const key = transition.targets.map((t) => t.id).join('+')
        const actionLabel = transition.targets.length > 1 ? CHOICE_ACTION : (ACTION_COPY[transition.targets[0].id] ?? `Continue to ${transition.targets[0].name}`)

        return (
          <div key={key} className="flex flex-col items-center gap-2 text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--ink)' }}>
              {actionLabel} →
            </p>
            {transition.targets.length > 1 ? (
              <ul className="flex flex-col items-center gap-1">
                {transition.targets.map((target) => (
                  <li key={target.id} className="text-base font-semibold">
                    <TargetLink name={target.name} href={target.href} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base font-semibold">
                <TargetLink name={transition.targets[0].name} href={transition.targets[0].href} />
              </p>
            )}
          </div>
        )
      })}
    </RevealOnView>
  )
}
