// Supabase's GoTrue exposes its own enabled-provider configuration at a
// public, unauthenticated endpoint (project settings, not a signed-in
// API call) -- this is how the login page can show "Continue with
// Google" exactly when the mounted auth module actually has Google
// configured, instead of a manually-flipped env flag that can silently
// drift from what's really configured in Supabase Auth. Read-only: this
// never changes auth behavior, only what the sign-in page decides to
// render.
// 'unavailable' (couldn't reach or parse the settings endpoint) is kept
// distinct from 'disabled' (Supabase answered and Google genuinely isn't
// configured) -- the caller still hides the button either way (offering an
// OAuth path we can't confirm works is worse than not offering it), but a
// silent network/parsing failure must not be reported as an intentional
// disable to anything inspecting this state.
export type AuthProviderCheckStatus = 'enabled' | 'disabled' | 'unavailable';

export interface AuthProviderCapabilities {
  google: boolean;
  status: AuthProviderCheckStatus;
}

const UNAVAILABLE: AuthProviderCapabilities = { google: false, status: 'unavailable' };

export async function fetchAuthProviderCapabilities(): Promise<AuthProviderCapabilities> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return UNAVAILABLE;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!res.ok) return UNAVAILABLE;
    const data = await res.json();
    const google = Boolean(data?.external?.google);
    return { google, status: google ? 'enabled' : 'disabled' };
  } catch {
    return UNAVAILABLE;
  }
}
