import { RevealOnView } from '@avatark/motion'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'

// AVK-UNIFICATION-03C §1. Midnight band, h1 + the approved honesty line. "Cinematic" comes from
// scale, contrast and spacing: no media until M-01 is cleared (a CSS hairline horizon stands in).
// The lede AVK-U03-LW-02 is PENDING owner approval and is not rendered.
// AVK-VISUAL-01B (OD-V2, LW-1): restrained midnight hero -- less vertical padding, a 52px maximum
// headline held to two lines, and the horizon moved up so no empty black band remains below it.
export function LivingWorldsIntro() {
  return (
    <section
      id="living-worlds-intro"
      aria-labelledby="living-worlds-title"
      className="avk-dark-surface relative overflow-hidden"
      style={{ background: 'var(--midnight)', color: 'var(--paper)' }}
    >
      <div aria-hidden="true" className="absolute inset-x-0 bottom-6 h-px opacity-40 md:bottom-10" style={{ background: 'var(--gold)' }} />
      <RevealOnView className="motion-emerge relative mx-auto flex w-full max-w-[var(--editorial-width)] flex-col items-center gap-5 px-6 pt-12 pb-14 text-center sm:px-8 md:py-20">
        <h1 id="living-worlds-title" className="max-w-[20ch] text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-[3.25rem]">
          {U['AVK-U03-LW-01']}
        </h1>
        <p className="text-sm leading-6" style={{ color: 'var(--paper)' }}>
          {C['AVK-FR-026']}
        </p>
      </RevealOnView>
    </section>
  )
}
