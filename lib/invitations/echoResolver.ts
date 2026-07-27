import { createLocalInvitationResolver, type InvitationResolver } from "@avatark/invitations";
import { decodeEchoInvitationToken } from "./tokenFormat.ts";

// The one InvitationResolver Echo uses. Swapping to a real ArenaK-backed
// resolver later (once that service is reachable from this app) means
// changing only this one export -- every caller depends on the
// InvitationResolver interface from @avatark/invitations, never on this
// being the local reference implementation.
export const echoInvitationResolver: InvitationResolver = createLocalInvitationResolver(decodeEchoInvitationToken);
