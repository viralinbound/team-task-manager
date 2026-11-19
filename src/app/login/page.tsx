"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Button, Field, inputCls } from "@/components/ui";
import { useStore } from "@/lib/store";
import { LIVE, supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/format";

export default function LoginPage() {
  return LIVE ? <LiveLogin /> : <DemoLogin />;
}

/** Real sign-in: we email a one-time link. No passwords to store or reset. */
function LiveLogin() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error")) setError("That sign-in link has expired or was already used. Request a new one.");
    supabase()
      .auth.getUser()
      .then(({ data }) => data.user && window.location.replace("/"));
  }, []);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-canvas lg:flex lg:flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/workboard-team/1200/1500" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <span className="relative font-display text-2xl font-semibold">Workboard</span>
        <div className="relative mt-auto max-w-md">
          <h1 className="font-display text-[44px] leading-[1.05] font-semibold">Every task has an owner. Every client knows where things stand.</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-canvas/75">Assign work to people or teams, see your own day at a glance, and let clients approve work without a single WhatsApp follow-up.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl font-semibold">Sign in</h2>
          {state === "sent" ? (
            <div className="mt-8 rounded-xl bg-ok-soft p-5 text-sm text-ok">
              <p className="font-semibold">Check your email</p>
              <p className="mt-1">We sent a sign-in link to {email}. Open it on this device. It works once and expires in an hour.</p>
              <button onClick={() => setState("idle")} className="mt-3 text-xs font-semibold underline">
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-muted">Enter your work email and we&apos;ll send you a sign-in link.</p>
              <form
                className="mt-8 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setState("sending");
                  const { error: err } = await supabase().auth.signInWithOtp({
                    email: email.trim(),
                    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
                  });
                  if (err) {
                    setError(err.message);
                    setState("idle");
                  } else setState("sent");
                }}
              >
                <Field label="Email">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} />
                </Field>
                {error && <p className="rounded-lg bg-urgent-soft px-3 py-2 text-xs text-urgent">{error}</p>}
                <Button type="submit" className="w-full" disabled={state === "sending"}>
                  {state === "sending" ? "Sending…" : "Email me a sign-in link"}
                </Button>
              </form>
              <p className="mt-6 text-xs leading-relaxed text-muted">Only people your admin has invited can get in. If you were invited, use the same email the invite went to.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoLogin() {
  const router = useRouter();
  const s = useStore();
  const [mode, setMode] = useState<"login" | "forgot" | "invite">("login");
  const [sent, setSent] = useState(false);

  const enter = (role: "admin" | "member" | "client") => {
    s.switchUser(role === "admin" ? "u-admin" : role === "member" ? "u-priya" : "u-client");
    router.push(role === "client" ? "/portal" : "/");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* left: brand panel */}
      <div className="relative hidden overflow-hidden bg-ink p-12 text-canvas lg:flex lg:flex-col">
        {/* placeholder photo: replace with a real team photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/workboard-team/1200/1500" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />

        <span className="relative font-display text-2xl font-semibold">Workboard</span>

        <div className="relative mt-auto max-w-md">
          <h1 className="font-display text-[44px] leading-[1.05] font-semibold">Every task has an owner. Every client knows where things stand.</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-canvas/75">Assign work to people or teams, see your own day at a glance, and let clients approve work without a single WhatsApp follow-up.</p>
          <div className="mt-8 flex items-center gap-3">
            <span className="flex -space-x-2">
              {s.users
                .filter((u) => u.role !== "client")
                .slice(0, 6)
                .map((u) => (
                  <Avatar key={u.id} user={u} size={36} ring />
                ))}
            </span>
            <span className="text-sm text-canvas/75">Your whole team, one place.</span>
          </div>
        </div>
      </div>

      {/* right: form */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {mode === "login" && (
            <>
              <h2 className="font-display text-3xl font-semibold">Sign in</h2>
              <p className="mt-1.5 text-sm text-muted">Welcome back. Use your work email.</p>
              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  enter("admin");
                }}
              >
                <Field label="Email">
                  <input type="email" placeholder="you@company.com" className={inputCls} />
                </Field>
                <Field label="Password">
                  <input type="password" placeholder="••••••••" className={inputCls} />
                </Field>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs font-semibold text-brand hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full">
                  Sign in
                </Button>
                <div className="flex items-center gap-3 text-xs text-faint">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={() => enter("admin")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
                    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1Z" />
                    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
                  </svg>
                  Continue with Google
                </Button>
              </form>
              <p className="mt-6 text-center text-xs text-muted">
                Got an invite?{" "}
                <button onClick={() => setMode("invite")} className="font-semibold text-brand hover:underline">
                  Accept it here
                </button>
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="font-display text-3xl font-semibold">Reset password</h2>
              <p className="mt-1.5 text-sm text-muted">We&apos;ll email you a link to set a new one.</p>
              {sent ? (
                <p className="mt-8 rounded-xl bg-ok-soft p-4 text-sm text-ok">Check your inbox for the reset link.</p>
              ) : (
                <form
                  className="mt-8 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                >
                  <Field label="Email">
                    <input type="email" required placeholder="you@company.com" className={inputCls} />
                  </Field>
                  <Button type="submit" className="w-full">
                    Send reset link
                  </Button>
                </form>
              )}
              <button onClick={() => (setMode("login"), setSent(false))} className="mt-6 text-xs font-semibold text-brand hover:underline">
                ← Back to sign in
              </button>
            </>
          )}

          {mode === "invite" && (
            <>
              <h2 className="font-display text-3xl font-semibold">Join your team</h2>
              <p className="mt-1.5 text-sm text-muted">Aarav Mehta invited you to Workboard as a Member of the Design team.</p>
              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  enter("member");
                }}
              >
                <Field label="Full name">
                  <input placeholder="Your name" className={inputCls} />
                </Field>
                <Field label="Create password" hint="At least 8 characters">
                  <input type="password" className={inputCls} />
                </Field>
                <Button type="submit" className="w-full">
                  Create account
                </Button>
              </form>
              <button onClick={() => setMode("login")} className="mt-6 text-xs font-semibold text-brand hover:underline">
                ← Back to sign in
              </button>
            </>
          )}

          <div className="mt-12 rounded-xl border border-dashed border-line-strong p-4">
            <p className="text-xs font-semibold text-ink-soft">Prototype: jump straight in as</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {(["admin", "member", "client"] as const).map((r) => (
                <button key={r} onClick={() => enter(r)} className={cn("rounded-lg border border-line bg-surface py-2 text-xs font-semibold capitalize hover:border-brand hover:text-brand")}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-faint">
            <Link href="/" className="hover:underline">
              Skip to the app →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
