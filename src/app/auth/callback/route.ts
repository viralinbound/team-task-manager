import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** The sign-in link in the email lands here; swap its code for a session cookie, then open the app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code || (tokenHash && type)) {
    const store = await cookies();
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => list.forEach(({ name, value, options }) => store.set(name, value, options)),
      },
    });
    // ?code= comes from the emailed link (PKCE); ?token_hash= from a custom email template.
    const { error } = code ? await sb.auth.exchangeCodeForSession(code) : await sb.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    console.error("[auth/callback]", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
