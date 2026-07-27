import Link from 'next/link'
import { DepartureLink } from '@/components/motion/DepartureLink'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'

// Part 4 of Platform Milestone 1: framed as conditional next-steps tied to
// what a person just did, not a dated roadmap -- deliberately distinct from
// the Expression Layer above it (which states what ArenaK/StreamK/CinemaK
// *are*; this states what to do *next*, once you've already practiced,
// competed, or inspired someone).
const PROMPTS = [
  { id: 'arenak', question: 'Finished a Practice?', cta: 'Join ArenaK' },
  { id: 'streamk', question: 'Completed a Challenge?', cta: 'Share on StreamK' },
  { id: 'cinemak', question: 'Inspired Others?', cta: 'Become part of CinemaK' },
] as const

export function ContinueYourJourney() {
  return (
    <RevealOnView className="motion-emerge-stagger flex flex-col items-center gap-6">
      {PROMPTS.map((prompt) => {
        const product = resolveEcosystemProduct(prompt.id)
        const external = product.href?.startsWith('http') ?? false

        return (
          <div key={prompt.id} className="flex flex-col items-center gap-2 text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--ink)' }}>
              {prompt.question}
            </p>
            <span aria-hidden="true" className="text-xl" style={{ color: 'var(--gold)' }}>
              ↓
            </span>
            {product.href ? (
              external ? (
                <DepartureLink
                  href={product.href}
                  className="link-underline-draw rounded-sm text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                >
                  {prompt.cta} →
                </DepartureLink>
              ) : (
                <Link
                  href={product.href}
                  className="link-underline-draw rounded-sm text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                >
                  {prompt.cta} →
                </Link>
              )
            ) : (
              <span className="text-base font-semibold" style={{ color: 'var(--ink-dim)' }}>
                {prompt.cta}
              </span>
            )}
          </div>
        )
      })}
    </RevealOnView>
  )
}
