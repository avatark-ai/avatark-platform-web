import { RevealOnView } from '@/components/motion/RevealOnView'

// RC4 Final Polish: replaces ConnectedProducts.tsx, which repeated the same
// four-item "Uses" list under every Growth Engine card and told a visitor
// nothing they hadn't already read three times. This explains the seven
// shared platform services themselves, once, as their own concept -- not
// re-attributed per product -- which is what actually helps someone
// understand why the ecosystem is one platform rather than several
// products that happen to sit next to each other.
const PLATFORM_SERVICES = [
  { id: 'identity', name: 'Identity', description: 'One identity carried across every product in the ecosystem.' },
  { id: 'account', name: 'Account', description: 'Shared profile, preferences and privacy controls.' },
  { id: 'invitations', name: 'Invitations', description: 'Gated entry between products, honored consistently.' },
  { id: 'navigation', name: 'Navigation', description: 'One consistent way to move between products.' },
  { id: 'motion', name: 'Motion', description: 'The same visual language and interaction rhythm everywhere.' },
  { id: 'recommendations', name: 'Recommendations', description: 'What to do next, computed from where you are.' },
  { id: 'living-echo', name: 'Living Echo', description: 'The continuing record of practice a person carries with them.' },
] as const

export function PlatformServices() {
  return (
    <RevealOnView className="motion-emerge-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {PLATFORM_SERVICES.map((service) => (
        <div key={service.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {service.name}
          </h3>
          <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--ink-dim)' }}>
            {service.description}
          </p>
        </div>
      ))}
    </RevealOnView>
  )
}
