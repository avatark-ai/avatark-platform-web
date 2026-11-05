import { STATUS_STYLE, type PlatformStatus } from '@/components/ecosystem/StatusBadge'

// AVK-UNIFICATION-03B: StatusBadge's bordered-pill visual for approved mixed-case status text
// (e.g. AVK-FLW-ST-01 "In development"). StatusBadge only accepts its upper-case maturity enum, which
// drives the ecosystem scale, so the approved string is passed through here instead. The DOM text is
// the approved string byte-for-byte; the upper-case look is CSS only.
export function StatusPill({ text, tier }: { text: string; tier: PlatformStatus }) {
  const style = STATUS_STYLE[tier]
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: style.color, borderColor: style.borderColor }}
    >
      {text}
    </span>
  )
}
