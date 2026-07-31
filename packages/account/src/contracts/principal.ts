// The minimal authenticated-identity contract the Account UI needs.
// A discriminated union, not a nullable object, so "loading" is a real,
// distinct state the shell can render honestly.
export type AccountPrincipal =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; id: string; displayName: string; email: string }
