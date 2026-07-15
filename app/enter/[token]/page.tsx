import { redirect } from "next/navigation";
import { GUIDE_SLUG } from "@/lib/onboarding/guide";

// Entry into Invitation (RC3) -- this repo's own invitation surface.
// Deliberately does not validate `token` against any database (no
// cross-project DB access, see docs/INVITATION_MIGRATION.md) -- any
// string is accepted and carried forward purely as an attribution
// param. This is separate from, and does not touch, legacy
// avatark-web's real /enter/[token] (the BITS chapter/reflection
// pilot) or its QR codes, which keep pointing directly at avatark.ai.
export default async function EnterInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const search = await searchParams;

  const url = new URL(`/guide/${GUIDE_SLUG}`, "https://placeholder.invalid");
  url.searchParams.set("invitation", token);
  const intention = typeof search.intention === "string" ? search.intention : null;
  if (intention) url.searchParams.set("intention", intention);

  redirect(`${url.pathname}${url.search}`);
}
