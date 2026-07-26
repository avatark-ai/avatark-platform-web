'use client'

import { useEffect, useRef, useState } from 'react'
import type { CanonAxis } from '@/lib/content/foundation'
import { polylineLength } from '@/lib/motion/pathLength'

// Shared four-axis cross diagram -- Awareness/Adiyogi and Responsibility/
// Rama on a horizontal line through Wisdom/Krishna at the center, with
// Creation/Prometheus as the perpendicular fourth axis below. Used by
// both /canon (interactive, tied to the Four Axes tabs -- pass
// `activeIndex`) and /founder/synthesis (a plain one-time entrance, no
// `activeIndex`) so this geometry exists exactly once rather than as two
// near-duplicate SVGs.
//
// Entry sequence (plays once, when a RevealOnView ancestor adds
// .is-revealed): Awareness emerges -> line draws to Wisdom -> Wisdom
// emerges -> line continues to Responsibility -> Responsibility emerges
// -> vertical line draws -> Creation emerges. Staged via --motion-delay
// on the shared EMERGE/DRAW primitives, not bespoke keyframes.
const POSITIONS = [
  { x: 70, y: 60, labelAnchor: 'middle' as const, labelDx: 0 },
  { x: 200, y: 60, labelAnchor: 'end' as const, labelDx: -16 },
  { x: 330, y: 60, labelAnchor: 'middle' as const, labelDx: 0 },
  { x: 200, y: 220, labelAnchor: 'end' as const, labelDx: -16 },
] as const

// Kept in sync by hand with --motion-duration-emerge in globals.css (this
// diagram needs the actual number to compute when the sequence settles).
const NODE_EMERGE_MS = 500
const STAGE_STEP_MS = 300

const STAGE = {
  awareness: 0,
  segmentAW: STAGE_STEP_MS * 1,
  wisdom: STAGE_STEP_MS * 2,
  segmentWR: STAGE_STEP_MS * 3,
  responsibility: STAGE_STEP_MS * 4,
  segmentVertical: STAGE_STEP_MS * 5,
  creation: STAGE_STEP_MS * 6,
}

// Total time until the diagram is fully settled -- exported so a caller
// (Canon.tsx) can delay the axis explanation panel's own first reveal
// until the geometry finishes, per the brief's entry sequence, without
// hard-coding the number twice.
export const FOUR_AXES_ENTRY_SETTLE_MS = STAGE.creation + NODE_EMERGE_MS

// Which connecting segment(s) touch a given node index -- used to decide
// which lines get emphasis when that axis is active.
const SEGMENTS_BY_NODE: Record<number, ('AW' | 'WR' | 'V')[]> = {
  0: ['AW'],
  1: ['AW', 'WR', 'V'],
  2: ['WR'],
  3: ['V'],
}

export function FourAxesGeometry({ axes, activeIndex }: { axes: CanonAxis[]; activeIndex?: number }) {
  const nodes = axes.map((axis, index) => ({ ...axis, ...POSITIONS[index] })).filter((node) => node.x !== undefined)
  const hasMounted = useRef(false)
  const [pulse, setPulse] = useState<{ index: number; key: number } | null>(null)

  useEffect(() => {
    if (activeIndex === undefined) return
    if (!hasMounted.current) {
      // The first activeIndex is part of the entry sequence's own settle,
      // not a user-driven change -- no pulse on initial mount.
      hasMounted.current = true
      return
    }
    setPulse((prev) => ({ index: activeIndex, key: (prev?.key ?? 0) + 1 }))
  }, [activeIndex])

  if (nodes.length < 4) return null
  const [awareness, wisdom, responsibility, creation] = nodes
  const segAW = polylineLength([awareness, wisdom])
  const segWR = polylineLength([wisdom, responsibility])
  const segV = polylineLength([wisdom, creation])

  const activeSegments = activeIndex !== undefined ? new Set(SEGMENTS_BY_NODE[activeIndex]) : null

  function segmentStyle(segment: 'AW' | 'WR' | 'V'): React.CSSProperties {
    const emphasized = activeSegments?.has(segment) ?? false
    return {
      stroke: emphasized ? 'var(--gold)' : 'var(--paper-line)',
      strokeWidth: emphasized ? 2.5 : 2,
      transition: 'stroke 200ms var(--motion-ease-settle), stroke-width 200ms var(--motion-ease-settle)',
    }
  }

  return (
    <svg
      viewBox="0 0 400 260"
      className="h-auto w-full"
      role="img"
      aria-label={`The four axes: ${nodes.map((node) => `${node.label} (${node.figure})`).join(', ')}`}
    >
      <line
        x1={awareness.x}
        y1={awareness.y}
        x2={wisdom.x}
        y2={wisdom.y}
        strokeDasharray={segAW}
        strokeDashoffset={segAW}
        className="motion-draw-fast"
        style={{ ...segmentStyle('AW'), '--motion-delay': `${STAGE.segmentAW}ms` } as React.CSSProperties}
      />
      <line
        x1={wisdom.x}
        y1={wisdom.y}
        x2={responsibility.x}
        y2={responsibility.y}
        strokeDasharray={segWR}
        strokeDashoffset={segWR}
        className="motion-draw-fast"
        style={{ ...segmentStyle('WR'), '--motion-delay': `${STAGE.segmentWR}ms` } as React.CSSProperties}
      />
      <line
        x1={wisdom.x}
        y1={wisdom.y}
        x2={creation.x}
        y2={creation.y}
        strokeDasharray={segV}
        strokeDashoffset={segV}
        className="motion-draw-fast"
        style={{ ...segmentStyle('V'), '--motion-delay': `${STAGE.segmentVertical}ms` } as React.CSSProperties}
      />

      {nodes.map((node, index) => {
        const stageMs = [STAGE.awareness, STAGE.wisdom, STAGE.responsibility, STAGE.creation][index]
        const active = activeIndex === index
        return (
          <g
            key={node.id}
            className="motion-emerge"
            style={{ '--motion-delay': `${stageMs}ms` } as React.CSSProperties}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={active ? 12 : 10}
              fill={active ? 'var(--gold)' : 'var(--paper)'}
              stroke="var(--gold)"
              strokeWidth={active ? 3.5 : 3}
              style={{ transition: 'r 200ms var(--motion-ease-settle), fill 200ms var(--motion-ease-settle), stroke-width 200ms var(--motion-ease-settle)' }}
            />
            {pulse && pulse.index === index && (
              <circle
                key={pulse.key}
                cx={node.x}
                cy={node.y}
                r={10}
                fill="none"
                stroke="var(--gold)"
                strokeWidth={2}
                className="motion-ripple-node is-pulsing"
              />
            )}
            <text
              x={node.x + node.labelDx}
              y={node.labelAnchor === 'middle' ? node.y - 22 : node.y - 6}
              textAnchor={node.labelAnchor}
              className="text-[18px] font-semibold"
              fill={active ? 'var(--gold)' : 'var(--ink)'}
              style={{ transition: 'fill 200ms var(--motion-ease-settle)' }}
            >
              {node.label}
            </text>
            <text
              x={node.x + node.labelDx}
              y={node.labelAnchor === 'middle' ? node.y + 34 : node.y + 18}
              textAnchor={node.labelAnchor}
              className="text-[14px]"
              fill="var(--ink-dim)"
            >
              {node.figure}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
