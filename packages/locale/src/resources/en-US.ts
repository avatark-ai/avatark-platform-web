import type { LocaleResourceBundle } from '../types.ts'

// The only materially-complete resource bundle today. `en-IN` intentionally
// reuses these same strings (same language, different region/date/number
// formatting) rather than forking a duplicate copy -- see helpers.ts.
export const EN_US: LocaleResourceBundle = {
  auth: {
    eyebrow: 'AVATARK IDENTITY',
    signInHeading: 'Sign in',
    identityStatement: 'One identity across the AvatarK ecosystem.',
    magicLinkCta: 'Send magic link',
    googleCta: 'Continue with Google',
    unavailable: 'Sign-in is temporarily unavailable. Please try again later.',
  },
  account: {
    profile: 'Profile',
    products: 'Products',
    membership: 'Membership',
    preferences: 'Preferences',
    privacy: 'Privacy',
    security: 'Security',
    dataExport: 'Data & Export',
    feedback: 'Feedback',
    support: 'Support',
  },
  membership: {
    free: 'Free',
    paid: 'Paid',
    enterprise: 'Enterprise',
    education: 'Education',
  },
  products: {
    switchProduct: 'Switch product',
    currentProduct: 'Current product',
  },
  preferences: {
    theme: 'Appearance',
    locale: 'Language & region',
    reducedMotion: 'Reduce motion',
  },
  privacy: {
    profileVisibility: 'Profile visibility',
    dataSharing: 'Data sharing',
  },
  security: {
    connectedMethods: 'Connected sign-in methods',
    activeSessions: 'Active sessions',
    signOutAllDevices: 'Sign out of all devices',
  },
  dataExport: {
    exportIdentity: 'Export identity & profile',
    exportActivity: 'Export product activity',
    closeIdentity: 'Close AvatarK identity',
  },
  notifications: {
    securityAccount: 'Security and account',
    invitations: 'Invitations',
    productAnnouncements: 'Product announcements',
  },
  organizations: {
    currentOrganization: 'Current organization',
    switchOrganization: 'Switch organization',
    personal: 'Personal',
  },
  diagnostics: {
    signedInState: 'Signed-in state',
    systemStatus: 'System status',
    copySafeDiagnostics: 'Copy safe diagnostics',
  },
}
