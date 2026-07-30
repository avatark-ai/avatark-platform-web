// Supabase's GoTrue exposes its own enabled-provider configuration at a
// public, unauthenticated endpoint (project settings, not a signed-in
// API call) -- this is how the login page can show "Continue with
// Google" exactly when the mounted auth module actually has Google
// configured, instead of a manually-flipped env flag that can silently
// drift from what's really configured in Supabase Auth. Read-only: this
// never changes auth behavior, only what the sign-in page decides to
// render.
export interface AuthProviderCapabilities {
  google: boolean;
}

const UNAVAILABLE: AuthProviderCapabilities = { google: false };

export async function fetchAuthProviderCapabilities(): Promise<AuthProviderCapabilities> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return UNAVAILABLE;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!res.ok) return UNAVAILABLE;
    const data = await res.json();
    return { google: Boolean(data?.external?.google) };
  } catch {
    return UNAVAILABLE;
  }
}
