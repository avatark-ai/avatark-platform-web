import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EchoShell } from "@/components/echo/shell/EchoShell";
import { resolveSite } from "@/lib/sites/resolveSite";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AvatarK — Explore, practice, connect, or watch",
  description: "Pick what fits right now. AvatarK carries your account and progress underneath, wherever you go next.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await resolveSite();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Safety net for the institutional motion system (app/globals.css):
            .motion-emerge/.motion-draw start hidden and only reveal once
            RevealOnView/PageEnter (client components) add .is-revealed on
            scroll-into-view or mount. If JS never runs, this <noscript>
            stylesheet -- parsed only in that case -- forces everything
            back to its resting, fully visible state instead of leaving it
            permanently hidden. */}
        <noscript>
          <style>{`.motion-emerge,.motion-emerge-stagger>*,.motion-draw,.motion-draw-fast{opacity:1!important;transform:none!important;stroke-dashoffset:0!important;animation:none!important;}`}</style>
        </noscript>
        <EchoShell site={site}>{children}</EchoShell>
      </body>
    </html>
  );
}
