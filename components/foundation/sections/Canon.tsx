'use client'

import { useEffect, useRef, useState } from 'react'
import type { CanonContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@avatark/motion'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { FourAxesGeometry, FOUR_AXES_ENTRY_SETTLE_MS } from '@/components/foundation/geometry/FourAxesGeometry'

// Desktop: tabs, one axis visible at a time, above a shared geometry
// diagram that's always visible and reacts to the active tab. Mobile:
// accordion, same data and same geometry, no separate content model.
//
// Motion: the geometry plays its staged entrance once (Awareness -> line
// -> Wisdom -> line -> Responsibility -> line -> Creation), then the
// explanation for the default axis fades in -- once, on first reveal
// only. After that, switching axes moves the tab's active indicator,
// emphasizes the relevant line/node in the geometry with one localized
// pulse, and crossfades the explanation text -- it never replays the
// full entrance.
//
// This renders only the geometry + axes tablist/accordion, not a page
// masthead -- its one caller (app/canon/page.tsx) owns the page's own
// title/intro, so this doesn't repeat "The Canon" and its intro
// paragraph a second time on the same page.
export function Canon({ content }: { content: CanonContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const activeIndex = openIndex ?? 0

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // AVK-PROD-A11Y-12 (OD-12, option 12-A): APG tabs with automatic activation, the same pattern as
  // PrinciplesPanel. Arrows wrap; Home/End jump; focus moves with the selection (roving tabindex).
  // Every panel is already in the DOM, so selecting on arrow adds no loading or latency.
  function selectTab(i: number) {
    const n = content.axes.length
    const next = (i + n) % n
    setOpenIndex(next)
    tabRefs.current[next]?.focus()
  }
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    function measure() {
      const el = tabRefs.current[activeIndex]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIndex])

  return (
    <section id="four-axes">
      <SectionContainer>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold-ink)' }}>
          {content.subtitle}
        </p>

        <RevealOnView className="mx-auto mt-6 max-w-lg sm:max-w-xl">
          <FourAxesGeometry axes={content.axes} activeIndex={activeIndex} />
        </RevealOnView>

        {/* Desktop: tabs */}
        <div className="mt-8 hidden sm:block">
          <div className="relative border-b" style={{ borderColor: 'var(--paper-line)' }}>
            <div
              role="tablist"
              aria-label="The Four Axes"
              className="flex"
              onKeyDown={(event) => {
                const map: Record<string, number> = { ArrowRight: activeIndex + 1, ArrowLeft: activeIndex - 1, Home: 0, End: content.axes.length - 1 }
                if (event.key in map) {
                  event.preventDefault()
                  selectTab(map[event.key])
                }
              }}
            >
              {content.axes.map((axis, index) => {
                const selected = index === activeIndex
                return (
                  <button
                    key={axis.id}
                    ref={(el) => {
                      tabRefs.current[index] = el
                    }}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`canon-panel-${axis.id}`}
                    id={`canon-tab-${axis.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setOpenIndex(index)}
                    className="flex-auto rounded-t-sm px-4 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: selected ? 'var(--ink)' : 'var(--ink-dim)', outlineColor: 'var(--focus-ring)' }}
                  >
                    {/* AVK-PROD-A11Y-09B (WCAG 1.4.10): label and figure may wrap onto two lines when space is
                        short; flex-auto keeps one line whenever the row fits; the space keeps the accessible
                        name "Awareness Adiyogi". Words are never split. */}
                    <span className="inline-flex flex-wrap items-baseline justify-center gap-x-2">
                      <span>{axis.label}</span>{' '}
                      <span className="text-xs font-normal" style={{ color: 'var(--ink-dim)' }}>
                        {axis.figure}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            {/* AVK-PROD-A11Y-11 (OD-11, option 11-A): 3px --gold-ink bar, 5.02:1 on paper (WCAG 1.4.11).
                OD-15: in forced-colors mode the authored background would be replaced by Canvas and the bar
                would vanish, so it opts out of forced adjustment and uses the system CanvasText colour
                (Highlight was tested and rejected: Chromium draws the forced focus outline in Highlight, so
                selection and focus would share a colour). The colour lives in the class list, not the inline
                style, so the forced-colors variant can override it. */}
            {indicator && (
              <span
                aria-hidden="true"
                data-canon-indicator=""
                className="pointer-events-none absolute bottom-[-1px] left-0 block h-[3px] w-px bg-[var(--gold-ink)] forced-colors:bg-[color:CanvasText] forced-colors:forced-color-adjust-none"
                style={{
                  transform: `translateX(${indicator.left}px) scaleX(${indicator.width})`,
                  transformOrigin: 'left',
                  transition: 'transform 250ms var(--motion-ease-settle)',
                }}
              />
            )}
          </div>
          <RevealOnView className="motion-emerge" style={{ '--motion-delay': `${FOUR_AXES_ENTRY_SETTLE_MS}ms` } as React.CSSProperties}>
            {content.axes.map((axis, index) => (
              <div
                key={axis.id}
                role="tabpanel"
                id={`canon-panel-${axis.id}`}
                aria-labelledby={`canon-tab-${axis.id}`}
                hidden={index !== activeIndex}
                // AVK-PROD-A11Y-12 (OD-12b): the panel has no focusable content, so it is a Tab stop
                // itself (APG). Hidden panels are display:none and cannot take focus.
                tabIndex={0}
                className="motion-emerge-instant rounded-sm px-1 py-6 text-base leading-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: 'var(--ink-dim)', outlineColor: 'var(--focus-ring)' }}
              >
                {axis.body}
              </div>
            ))}
          </RevealOnView>
        </div>

        {/* Mobile: accordion */}
        <div className="mt-6 flex flex-col gap-2 sm:hidden">
          {content.axes.map((axis, index) => {
            const expanded = openIndex === index
            return (
              <div key={axis.id} className="rounded-lg border" style={{ borderColor: 'var(--paper-line)' }}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`canon-accordion-${axis.id}`}
                  onClick={() => setOpenIndex(expanded ? null : index)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
                >
                  <span>
                    {axis.label} <span className="font-normal" style={{ color: 'var(--ink-dim)' }}>{axis.figure}</span>
                  </span>
                  <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                </button>
                {expanded && (
                  <div
                    id={`canon-accordion-${axis.id}`}
                    className="motion-emerge-instant px-4 pb-4 text-sm leading-6"
                    style={{ color: 'var(--ink-dim)' }}
                  >
                    {axis.body}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AVK-FOUNDER-LIVING-WORLDS-02 (AVK-FLW-CN-02 = AVK-FR-083-A): Platform framing
            below the Four Axes; the axis definitions above are unchanged. */}
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {L['AVK-FLW-CN-02']}
        </p>
      </SectionContainer>
    </section>
  )
}
