"use client";

// Tiny shared state between EchoHeader and EchoBottomNav -- both are
// rendered independently from EchoShell, but the bottom nav must hide
// itself while the mobile menu is open (spec: "no sticky CTA competing
// with mobile bottom navigation"), so the open/close flag lives here
// instead of being duplicated in each component.
import { createContext, useContext, useState, type ReactNode } from "react";

interface EchoMobileMenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const EchoMobileMenuCtx = createContext<EchoMobileMenuState | null>(null);

export function EchoMobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <EchoMobileMenuCtx.Provider value={{ open, setOpen }}>{children}</EchoMobileMenuCtx.Provider>;
}

export function useEchoMobileMenu(): EchoMobileMenuState {
  const ctx = useContext(EchoMobileMenuCtx);
  if (!ctx) throw new Error("useEchoMobileMenu must be used within EchoMobileMenuProvider");
  return ctx;
}
