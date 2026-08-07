import type { ExperienceEvent, ExperienceRegistry } from "@avatark/experience-registry"

// Moved here from packages/experience-registry/src/activityAdapter.ts
// during the Runtime Kernel integration (Sprint 3), per the
// adapter-ownership fix docs/RUNTIME_KERNEL_ARCHITECTURE.md Part 1
// identified: a Presentation-role adapter (reshapes a runtime's output to
// match @avatark/account's UI contract) belongs in the Host's lib/, never
// inside the runtime package itself -- @avatark/experience-registry stays
// a true leaf with zero knowledge of @avatark/account.
//
// Mirrors (does NOT import) @avatark/account's ExtensionAdapter contract
// (packages/account/src/contracts/adapters.ts) structurally. TypeScript's
// structural typing means a host can assign
// createExperienceActivityAdapter(...)'s return value straight into an
// `ExtensionAdapter[]` with no cast. Not wired into any app page here --
// a host wires it into app/account/page.tsx's AccountAdapters.extensions
// when it's ready.
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
// localization-aware -- that's @avatark/locale's job, not this adapter's.
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
