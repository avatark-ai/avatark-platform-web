import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { classifyInvitationStatus } from "@avatark/invitations";
import { echoInvitationResolver } from "@/lib/invitations/echoResolver";
import { invitationContinueHref, previewInvitationDestination } from "@/lib/invitations/destination";
import { describeInvitation } from "@/lib/invitations/metadata";
import { InvitationAcceptGate } from "@/components/echo/invitations/InvitationAcceptGate";
import { InvitationMetadataPanel } from "@/components/echo/invitations/InvitationMetadataPanel";
import { InvitationJourneyDiagram } from "@/components/echo/invitations/InvitationJourneyDiagram";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";
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

  if (status !== "pending") {
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

  const preview = previewInvitationDestination(invitation.destination);

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

  const finalHref = intention ? `${continueHref}&intention=${encodeURIComponent(intention)}` : continueHref;
  const answers = describeInvitation(invitation, preview);
  const practiceSlug =
    invitation.destination.type === "practice" || invitation.destination.type === "echo_practice"
      ? invitation.destination.practiceSlug
      : null;

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
      </div>
    </EchoPageShell>
  );
}
