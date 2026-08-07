import type { ExperienceEvent } from "./types.ts"
import type { ExperienceRegistry } from "./registry.ts"

// Mirrors (does NOT import) @avatark/account's ExtensionAdapter contract
// (packages/account/src/contracts/adapters.ts) structurally, so this
// package can produce a value shaped to slot directly into a host's
// `AccountAdapters.extensions` array without experience-registry taking a
// compile-time dependency on @avatark/account or any other sibling
// package -- per the mission's "avoid direct compile-time dependencies on
// unfinished sibling packages" principle. TypeScript's structural typing
// means a host can assign createExperienceActivityAdapter(...)'s return
// value straight into an `ExtensionAdapter[]` with no cast.
//
// This is the "minimal Timeline/Recent Activity adapter surface" called
// for by the mission -- NOT the Timeline package itself (@avatark/timeline
// remains untouched) and not wired into any app page here. A host wires it
// into app/account/page.tsx's AccountAdapters.extensions when it's ready.
interface AccountExtensionItem {
  id: string
  title: string
  subtitle?: string
  status?: string
  href?: string
}

interface AccountExtensionSlotContent {
  emptyMessage?: string
  emptyActionHref?: string
  emptyActionLabel?: string
  items: AccountExtensionItem[]
  footerHref?: string
  footerLabel?: string
}

interface AccountAdapterResult<T> {
  data?: T
  error?: string
}

interface AccountExtensionAdapter {
  slotId: string
  label: string
  get(): Promise<AccountAdapterResult<AccountExtensionSlotContent>>
}

export interface ExperienceActivityAdapterOptions {
  slotId?: string
  label?: string
  /** How many recent events to surface in the slot. */
  limit?: number
}

// "narrative.started" -> "Narrative started". Deliberately not
// localization-aware -- that's @avatark/locale's job, not this package's.
function humanizeExperienceType(type: string): string {
  const words = type.split(/[._]/).filter(Boolean)
  if (words.length === 0) return type
  const [first, ...rest] = words
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ")
}

function toExtensionItem(event: ExperienceEvent): AccountExtensionItem {
  return {
    id: event.id,
    title: humanizeExperienceType(event.type),
    // Raw ISO timestamp, not a formatted/relative string -- formatting
    // per-user locale/timezone belongs to the host UI (@avatark/locale),
    // not to this data-only adapter.
    subtitle: event.occurredAt,
  }
}

/**
 * Builds an @avatark/account-compatible ExtensionAdapter backed by an
 * ExperienceRegistry. Shows a truthful empty state (no fabricated items,
 * no fake call-to-action) when the user has no recorded events yet.
 */
export function createExperienceActivityAdapter(
  registry: ExperienceRegistry,
  userId: string,
  options: ExperienceActivityAdapterOptions = {},
): AccountExtensionAdapter {
  const slotId = options.slotId ?? "experience-activity"
  const label = options.label ?? "Recent Activity"
  const limit = options.limit ?? 10

  return {
    slotId,
    label,
    async get(): Promise<AccountAdapterResult<AccountExtensionSlotContent>> {
      try {
        const events = await registry.listRecentEvents(userId, limit)
        return {
          data: {
            items: events.map(toExtensionItem),
            emptyMessage: events.length === 0 ? "No activity yet." : undefined,
          },
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to load recent activity." }
      }
    },
  }
}
