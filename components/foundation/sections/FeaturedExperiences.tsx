import { RevealOnView } from '@avatark/motion'
import { SectionContainer } from '@/components/foundation/Container'
import { ExperienceCard } from '@/components/foundation/sections/ExperienceCard'
import { TypographicWell } from '@/components/foundation/TypographicWell'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { DISCOVER_ECHO_HREF } from '@/lib/content/links'
import { PROD_SCOPE_I_COPY as P } from '@/lib/content/prodScopeICopy'
import { LIVING_WORLDS_HREF, LIVING_WORLDS_ROUTE_ENABLED } from '@/lib/content/livingWorldsRoute'

// AVK-UNIFICATION-03B (FEATURED-EXPERIENCES-SPEC): two equally prominent experiences replace the
// Echo-dominant EchoIntro and the LivingWorldsBand on "/". Echo first (owner order), DOM = visual
// order. The Living Worlds card keeps the legacy id="living-worlds" so existing /#living-worlds links
// still land on Living Worlds content, and always pairs its description with the approved status
// (AVK-FLW-ST-01) and honesty line (AVK-FR-026). Its action is withheld until /living-worlds exists.
// No raster media: Echo uses existing code-drawn geometry; Living Worlds a typographic well (M-01
// not cleared). Nothing here links to WorldK, /enter or an external host.

// AVK-VISUAL-01B (OD-V1, A1): both experience cards share one media-panel height -- 160px below lg,
// 16:9 from lg -- so headings, copy and actions align across the pair.
const EXPERIENCE_MEDIA_CLASS = 'h-40 lg:aspect-video lg:h-auto'

// Same shapes as the existing GeometryOfBecoming illustration (components/echo/journey), reused
// rather than drawn anew (MEDIA-CLEARANCE M-03). Decorative here, so aria-hidden. AVK-VISUAL-01B: the
// motif now sits in Echo's midnight media panel, larger and at full strength.
// AVK-ECOSYSTEM-WORLDK-02 (OD-EW-8): exported for reuse by /ecosystem ExperienceSystems; unchanged here.
export function EchoMotif() {
  return (
    <div
      className={`flex w-full items-center justify-center border-b px-6 ${EXPERIENCE_MEDIA_CLASS}`}
      style={{ background: 'var(--midnight)', borderColor: 'var(--paper-line)' }}
      aria-hidden="true"
      data-testid="echo-media-panel"
    >
      <svg viewBox="0 0 320 200" className="h-auto w-full max-w-[160px] lg:max-w-[200px]" focusable="false">
        <g fill="none" stroke="var(--gold)" strokeLinejoin="round" opacity="1">
          <rect x="130" y="70" width="60" height="60" strokeWidth="1.25" transform="rotate(45 160 100)" opacity="0.9" />
          <rect x="105" y="45" width="110" height="110" strokeWidth="1" transform="rotate(15 160 100)" opacity="0.6" />
          <circle cx="160" cy="100" r="82" strokeWidth="0.75" opacity="0.35" />
        </g>
        <circle cx="160" cy="100" r="3" fill="var(--gold)" />
      </svg>
    </div>
  )
}

// Fallback image well until a cleared Chitrakoot still exists: hairline horizon + the approved world
// name (AVK-FR-021) in small caps. AVK-VISUAL-01B: same panel height as Echo's (160px below lg, 16:9 from lg).
export function WorldWell() {
  return (
    <TypographicWell
      label={C['AVK-FR-021']}
      testId="living-worlds-fallback-well"
      className={EXPERIENCE_MEDIA_CLASS}
    />
  )
}

export function FeaturedExperiences() {
  return (
    <section
      id="experiences"
      tabIndex={-1}
      aria-labelledby="experiences-heading"
      className="scroll-mt-4 border-b outline-none"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <SectionContainer>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            {U['AVK-U03-FX-01']}
          </p>
          <h2 id="experiences-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {U['AVK-U03-FX-02']}
          </h2>
        </div>
        <RevealOnView className="motion-emerge mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ExperienceCard
            variant="echo"
            title={U['AVK-U03-FX-10']}
            description={U['AVK-U03-FX-11']}
            supporting={U['AVK-U03-FX-12']}
            action={{ label: P['AVK-PROD-CD1-01'], href: DISCOVER_ECHO_HREF }}
            media={<EchoMotif />}
          />
          <ExperienceCard
            id="living-worlds"
            variant="world"
            title={C['AVK-FR-003']}
            status={{ text: L['AVK-FLW-ST-01'], tier: 'IN DEVELOPMENT' }}
            description={U['AVK-U03-FX-20']}
            supporting={L['AVK-FLW-EC-05']}
            honesty={C['AVK-FR-026']}
            action={LIVING_WORLDS_ROUTE_ENABLED ? { label: U['AVK-U03-HN-08'], href: LIVING_WORLDS_HREF } : null}
            media={<WorldWell />}
          />
        </RevealOnView>
      </SectionContainer>
    </section>
  )
}
