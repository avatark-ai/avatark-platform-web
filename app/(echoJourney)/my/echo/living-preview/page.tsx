import { LivingEchoPage } from "@/components/echo/journey/LivingEchoView";

export default function Page() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <LivingEchoPage />
      </div>
    </main>
  );
}
