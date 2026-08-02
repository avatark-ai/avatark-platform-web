import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AvatarK — Ai4 Conference Demo",
  description: "Watch. Reflect. Continue. A guided walk through AvatarK for the Ai4 conference.",
};

export default function Ai4Layout({ children }: { children: React.ReactNode }) {
  return children;
}
