import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the app is connected to a real database. Without keys it runs as the click-through demo. */
export const LIVE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let browser: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!LIVE) throw new Error("Supabase is not configured");
  if (!browser) browser = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browser;
}
