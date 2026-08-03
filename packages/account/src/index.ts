// @avatark/account — public entry point.
// This is the ONLY supported import surface for external consumers.
// Provenance: forked from prometheusk-web's @avatark/account 0.1.1
// (commit 75d9ac0). See PROVENANCE.md.

export { AvatarKAccount } from './ui/AvatarKAccount.tsx'
export { AccountTabs } from './ui/AccountTabs.tsx'
export { ACCOUNT_TAB_KEYS, ACCOUNT_TAB_LABELS, extensionTabKey, isExtensionTabKey } from './contracts/tabs.ts'
export type { AccountTabKey, CoreTabKey, ExtensionTabKey } from './contracts/tabs.ts'
export { ExtensionTab } from './ui/ExtensionTab.tsx'
export { AccessTab } from './ui/AccessTab.tsx'
export { OrganizationsTab } from './ui/OrganizationsTab.tsx'
export { NotificationsTab } from './ui/NotificationsTab.tsx'
export { LivingWorldsTab } from './ui/LivingWorldsTab.tsx'
export { CurrentContextCard } from './ui/CurrentContextCard.tsx'
// Legacy single-purpose extension tabs -- compat only, see extensions/*.tsx headers.
export { ActivityTab } from './extensions/ActivityTab.tsx'
export { EchoesTab } from './extensions/EchoesTab.tsx'

export { AccountAdaptersProvider, useAccountAdapters } from './contracts/context.tsx'

export type { AvatarKAccountProps } from './contracts/shell.ts'
export type { AccountPrincipal } from './contracts/principal.ts'

export type {
  AdapterResult,
  AuthAdapter,
  AccountLocation,
  AccountProfile,
  ProfileAdapter,
  ProductAvailability,
  EntitlementState,
  AccountProduct,
  ProductWithAccess,
  ProductAccessAdapter,
  StatEntry,
  MembershipBenefit,
  ProductRelationship,
  MembershipSummary,
  MembershipAdapter,
  SelectOption,
  AccountPreferences,
  PreferencesAdapter,
  PrivacySettings,
  PlatformPrivacySettings,
  PrivacyControlDefinition,
  PublicContentVisibility,
  PrivacyAdapter,
  DeploymentStatus,
  IntegrationStatus,
  ProductAccessRequirement,
  UserAccessState,
  ProductAccessSummary,
  AccessAdapter,
  AccountOrganizationMembership,
  AccountOrganizationContext,
  OrganizationsAdapter,
  NotificationCategoryPreference,
  NotificationPreferencesState,
  NotificationsAdapter,
  ActivityEvent,
  ActivityAdapter,
  AccountEcho,
  EchoesAdapter,
  ExtensionItem,
  ExtensionSlotContent,
  ExtensionAdapter,
  ExportAdapter,
  DataExportScope,
  AccountClosureScope,
  AccountSupportConfig,
  AccountLinksConfig,
  AccountAdapters,
  AccountOrganizationInvitation,
  CurrentContextState,
  CurrentContextAdapter,
  LivingWorld,
  LivingWorldsAdapter,
  SystemInformationVisibilityTier,
  SystemServiceStatus,
  SystemInformationServiceStates,
  SystemInformationSnapshot,
  SystemInformationAdapter,
} from './contracts/adapters.ts'
export { DATA_EXPORT_SCOPES, ACCOUNT_CLOSURE_SCOPES, ACCOUNT_ROLE_OPTIONS } from './contracts/adapters.ts'
export { COUNTRY_OPTIONS, getStatesForCountry, getCitiesForState } from './data/geography.ts'

// GettingStartedAdapter deliberately NOT exported from the stable root --
// no real implementation exists anywhere in this codebase yet.

// Test helpers are intentionally public -- a consumer building their own
// adapter needs a real reference implementation to test against.
export { createMockAdapters } from './testing/mockAdapters.ts'
export type { MockAdapterOptions } from './testing/mockAdapters.ts'
