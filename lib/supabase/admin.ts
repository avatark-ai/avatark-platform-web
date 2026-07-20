// Server-only, service-role Supabase client for Platform Admin reads that
// legitimately need to cross RLS's owner-only boundary (looking up another
// user, listing all organizations, reading the audit log). Never import
// this from a 'use client' file, and never pass the client itself (or
// SUPABASE_SERVICE_ROLE_KEY) into any response body or client bundle.
//
// Deliberately returns null rather than throwing when the key is absent --
// no SUPABASE_SERVICE_ROLE_KEY is configured in local/preview today (see
// .env.example), and every caller must degrade to an honest "unavailable"
// state instead of crashing.
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
