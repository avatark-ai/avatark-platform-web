import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { classifyInvitationStatus } from "@avatark/invitations";
import { echoInvitationResolver } from "@/lib/invitations/echoResolver";
import { invitationContinueHref, previewInvitationDestination } from "@/lib/invitations/destination";
import { describeInvitation } from "@/lib/invitations/metadata";
import { manifestFromInvitation } from "@/lib/journey/manifest";
import { recoverJourney } from "@/lib/journey/recovery";
import { practiceIntroLink } from "@/lib/journey/deepLinks";
import { isPracticeHandoffAvailable } from "@/lib/onboarding/practiceHandoff";
import { InvitationAcceptGate } from "@/components/echo/invitations/InvitationAcceptGate";
import { InvitationMetadataPanel } from "@/components/echo/invitations/InvitationMetadataPanel";
import { InvitationJourneyDiagram } from "@/components/echo/invitations/InvitationJourneyDiagram";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";
import { EcosystemFlow } from "@/components/echo/shared/EcosystemFlow";
import { DISCOVER_HREF, START_HERE_HREF } from "@/lib/echo/links";

export const metadata: Metadata = {
  title: "Invitation — Echo",
};

// ArenaK is the invitation PRODUCER; this page is Echo's CONSUMER side
// of that contract (@avatark/invitations): resolve the token, preview
// honestly, authenticate if needed, accept, then launch the real
// destination. Echo never creates an invitation here, only resolves one
// -- see lib/invitations/echoResolver.ts for why resolution is local
// today (ArenaK's real invitation service isn't reachable from this
// workspace) and what changes when it is.
function UnavailableCard({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 ${ECHO_READING_WIDTH_CLASS.narrow}`}>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
        {body}
      </p>
      {action}
    </div>
  );
}

function FallbackCta() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={START_HERE_HREF}
        className="echo-cta-primary rounded-full px-6 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
      >
        Start Here
      </Link>
      <Link
        href={`${DISCOVER_HREF}?view=echoes`}
        className="echo-cta-secondary rounded-full border px-6 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
      >
        Explore Discover
      </Link>
    </div>
  );
}

export default async function EnterInvitationTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token: rawToken } = await params;
  const search = await searchParams;
  const intention = typeof search.intention === "string" ? search.intention : null;

  // Normalize once, here, so every downstream use (resolving, building
  // the continue/return URLs, the accept gate) works with the same
  // clean token -- see lib/invitations/tokenFormat.ts for why this
  // decoding step exists at all (a confirmed Next.js dynamic-segment
  // quirk in this app's version, not a general concern).
  let token = rawToken;
  try {
    token = decodeURIComponent(rawToken);
  } catch {
    // Malformed percent-encoding -- fall back to the raw token as-is.
  }

  const invitation = await echoInvitationResolver.resolve(token);

  if (!invitation) {
    return (
      <EchoPageShell layout="plain">
        <UnavailableCard
          title="This invitation isn't valid"
          body="We couldn't recognize this invitation link. It may have been mistyped, or the invitation it points to no longer exists."
          action={<FallbackCta />}
        />
      </EchoPageShell>
    );
  }

  const status = classifyInvitationStatus(invitation, new Date());
  const preview = previewInvitationDestination(invitation.destination);
  const practiceSlug =
    invitation.destination.type === "practice" || invitation.destination.type === "echo_practice"
      ? invitation.destination.practiceSlug
      : null;

  // The single decision object for this journey (lib/journey/manifest.ts),
  // fed into recoverJourney (lib/journey/recovery.ts) below -- see that
  // module for why "watchFirstAvailable: true" is an inert default here
  // (manifestFromInvitation never sets watchFirstId, so that branch of
  // recoverJourney can never fire for this manifest).
  const journeyManifest = manifestFromInvitation(token, invitation, invitation.destination, preview);
  const recovery = recoverJourney({
    invitationStatus: status,
    manifest: journeyManifest,
    practiceAvailable: practiceSlug ? isPracticeHandoffAvailable(practiceSlug) : true,
    watchFirstAvailable: true,
  });

  // recoverJourney only ever returns "expired_invitation"/"invalid_invitation"
  // when the invitation status itself isn't "pending" -- never for any
  // other reason -- so this is an exact replacement for a raw `status !==
  // "pending"` check. The per-status copy below stays keyed on `status`
  // (not `recovery.message`), since recovery's reason buckets are coarser
  // than these five distinct messages -- only the gate comes from
  // recovery, the wording doesn't.
  if (recovery?.reason === "expired_invitation" || recovery?.reason === "invalid_invitation") {
    let title: string;
    let body: string;
    switch (status) {
      case "accepted":
        title = "Already accepted";
        body = "This invitation has already been used.";
        break;
      case "expired":
        title = "This invitation has expired";
        body = "Ask whoever sent it for a new one.";
        break;
      case "exhausted":
        title = "This invitation is no longer available";
        body = "It's already been used the maximum number of times.";
        break;
      case "revoked":
        title = "This invitation was withdrawn";
        body = "It's no longer valid.";
        break;
      case "invalid":
      default:
        title = "This invitation isn't valid";
        body = "We couldn't recognize this invitation link.";
        break;
    }
    return (
      <EchoPageShell layout="plain">
        <UnavailableCard title={title} body={body} action={<FallbackCta />} />
      </EchoPageShell>
    );
  }

  if (!preview.available) {
    return (
      <EchoPageShell layout="plain">
        <UnavailableCard title={preview.title} body={preview.body} action={<FallbackCta />} />
      </EchoPageShell>
    );
  }

  const continueHref = invitationContinueHref(invitation.destination, token);
  if (!continueHref) {
    return (
      <EchoPageShell layout="plain">
        <UnavailableCard
          title="This invitation isn't ready yet"
          body="We recognized this invitation, but couldn't find a real destination for it."
          action={<FallbackCta />}
        />
      </EchoPageShell>
    );
  }

  // Practice/echo_practice destinations build their href via the shared
  // deep link builder (lib/journey/deepLinks.ts) -- byte-identical to the
  // manual `${continueHref}&intention=...` this replaces, verified against
  // deepLinks.test.ts. The "echo" case has no per-route builder in
  // deepLinks.ts (only /enter, /watch-first, /witness, /practice, /journey
  // are covered), so it keeps building its href the original way.
  const finalHref = practiceSlug
    ? practiceIntroLink(practiceSlug, { invitation: token, intention: intention ?? undefined }).href
    : intention
      ? `${continueHref}&intention=${encodeURIComponent(intention)}`
      : continueHref;
  const answers = describeInvitation(invitation, preview);

  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-6 ${ECHO_READING_WIDTH_CLASS.narrow}`}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          YOU&apos;RE INVITED
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{preview.title}</h1>
        <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {preview.body}
        </p>
        <InvitationMetadataPanel answers={answers} />
        <InvitationJourneyDiagram currentStep="preview" />
        <InvitationAcceptGate token={token} continueHref={finalHref} practiceSlug={practiceSlug} />
        <div className="border-t pt-6" style={{ borderColor: "var(--surface-line)" }}>
          <EcosystemFlow />
        </div>
      </div>
    </EchoPageShell>
  );
}
