import type { Invitation, InvitationDestination, InvitationResolver, InvitationToken } from "./types.ts";

// Reference resolver -- NOT a stand-in for a real ArenaK API. ArenaK's
// actual invitation service (creation, real tokens, QR codes, usage
// limits, analytics) lives in a separate repository this workspace does
// not have access to (packages/product-registry's own entry for
// "arenak" records `repository: null` for exactly this reason). Until a
// consumer product can reach that service directly, this resolver is
// the same honest, deliberately soft fallback avatark-platform-web's
// docs/INVITATION_MIGRATION.md already established for `/enter/[token]`:
// no cross-project database access, no fabricated validation -- any
// syntactically well-formed token decodes to a real, typed Invitation
// object instead of being passed around as a bare string, but nothing
// here claims to check it against ArenaK's actual invitation database.
//
// A real ArenaK-backed InvitationResolver (calling ArenaK's API once
// one is reachable) satisfies the exact same `InvitationResolver`
// interface -- swapping resolvers is the only change any consumer needs
// to make once that integration exists.

export interface LocalInvitationTokenPayload {
  destination: InvitationDestination;
  issuedBy?: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount?: number;
}

/**
 * Decodes a token into a destination. Kept as an injected function
 * (not hardcoded here) so a consumer product can resolve tokens against
 * its own real content (e.g. Echo matching a token to a real practice
 * slug) without this package ever importing that product's content
 * model -- exactly the "do not couple it to Echo" boundary this package
 * exists to hold.
 */
export type LocalTokenDecoder = (token: InvitationToken) => LocalInvitationTokenPayload | null;

const DEFAULT_ISSUER = "arenak";

export function createLocalInvitationResolver(decode: LocalTokenDecoder): InvitationResolver {
  return {
    async resolve(token: InvitationToken): Promise<Invitation | null> {
      if (!token || typeof token !== "string") return null;
      const payload = decode(token);
      if (!payload) return null;

      return {
        token,
        type: payload.destination.type,
        destination: payload.destination,
        status: "pending",
        metadata: {
          issuedBy: payload.issuedBy ?? DEFAULT_ISSUER,
          createdAt: new Date(0).toISOString(),
          expiresAt: payload.expiresAt ?? null,
          maxUses: payload.maxUses ?? null,
          useCount: payload.useCount ?? 0,
        },
      };
    },
  };
}
