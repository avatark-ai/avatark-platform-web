import Link from "next/link";
import { ENTER_INVITATION_HREF, SIGN_IN_HREF, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

const CHOICES = [
  {
    id: "invitation",
    label: "I Have an Invitation",
    body: "Enter a code or invitation link.",
    href: ENTER_INVITATION_HREF,
  },
  {
    id: "example",
    label: "Show Me an Example",
    body: "Watch a short Echo journey.",
    href: WATCH_FIRST_HREF,
  },
  {
    id: "choose",
    label: "Help Me Choose",
    body: "Answer a few questions and receive a suggested beginning.",
    href: "/start/choose",
  },
] as const;

export function StartHere() {
  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-6 ${ECHO_READING_WIDTH_CLASS.narrow}`}>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome to Echo</h1>
        <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          Echo helps you learn from lived experience, turn insight into practice, and preserve what changes.
        </p>
        <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
          How would you like to begin?
        </p>

        <ul className="flex flex-col gap-3">
          {CHOICES.map((choice) => (
            <li key={choice.id}>
              <Link
                href={choice.href}
                className="echo-card-interactive group flex w-full flex-col gap-1 rounded-2xl border px-6 py-4 hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold" style={{ color: "var(--paper)" }}>
                    {choice.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--gold)" }}
                  >
                    →
                  </span>
                </span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                  {choice.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Already have an account?{" "}
          <Link
            href={SIGN_IN_HREF}
            className="font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </EchoPageShell>
  );
}
