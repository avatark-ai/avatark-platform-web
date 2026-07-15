// Shared between app/api/onboarding/begin/route.ts (sets it) and
// app/continue/page.tsx (reads it) -- kept in one place so route.ts
// doesn't need a non-HTTP-method export.
export const ONBOARDING_STATE_COOKIE = 'rc5_onboarding_state';
