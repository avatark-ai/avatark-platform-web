'use client'
import { createContext, useContext, type ReactNode } from 'react'
import type { AccountAdapters } from './adapters.ts'

const AccountAdaptersContext = createContext<AccountAdapters | null>(null)

export function AccountAdaptersProvider({ adapters, children }: { adapters: AccountAdapters; children: ReactNode }) {
  return <AccountAdaptersContext.Provider value={adapters}>{children}</AccountAdaptersContext.Provider>
}

// Throws with a clear message rather than returning null silently -- a
// tab rendered outside the provider is a real integration bug and should
// fail loudly during development.
export function useAccountAdapters(): AccountAdapters {
  const ctx = useContext(AccountAdaptersContext)
  if (!ctx) throw new Error('useAccountAdapters() called outside AccountAdaptersProvider')
  return ctx
}
