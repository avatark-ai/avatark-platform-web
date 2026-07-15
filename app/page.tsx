import Link from "next/link";

const WATCH_FIRST_URL = "https://prometheusk.avatark.io/watch-first";

export default function Home() {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div className="flex max-w-xl flex-col items-center gap-8">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Every life leaves an Echo.
          <br />
          Build yours intentionally.
        </h1>

        <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          Learn from people. Practice what works.
          <br />
          Carry forward what changes you.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/start"
            className="rounded-md px-8 py-3 text-base font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--midnight)" }}
          >
            Begin with an Echo
          </Link>
          <Link
            href="/enter"
            className="rounded-md border px-8 py-3 text-base font-semibold transition-colors hover:border-[var(--gold)]"
            style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}
          >
            Enter an Invitation
          </Link>
        </div>

        <nav
          aria-label="Other ways to begin"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          <a href={WATCH_FIRST_URL} className="underline-offset-4 hover:underline hover:text-[var(--paper)]">
            Watch First
          </a>
          <Link href="/continue" className="underline-offset-4 hover:underline hover:text-[var(--paper)]">
            Continue Your Journey
          </Link>
          <Link href="/auth/sign-in" className="underline-offset-4 hover:underline hover:text-[var(--paper)]">
            Sign In
          </Link>
        </nav>
      </div>
    </main>
  );
}
