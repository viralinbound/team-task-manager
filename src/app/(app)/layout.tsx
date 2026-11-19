"use client";

import { Shell } from "@/components/Shell";
import { NewProjectProvider } from "@/components/NewProject";
import { useStore } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, loadError, me, live, reload, signOut } = useStore();
  // Wait for this browser's saved demo state (or the database) before drawing, so counts never flicker.
  if (!hydrated) return <div className="min-h-dvh bg-canvas" />;

  if (live && (loadError || !me.id || me.role === "viewer")) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-display text-2xl font-semibold">{loadError ? "Couldn't load your workspace" : "Waiting for access"}</p>
          <p className="mt-2 text-sm text-muted">
            {loadError
              ? loadError
              : `You're signed in as ${me.email || "a new user"}, but an admin hasn't invited this email yet. Ask your admin to add you under Team & people, then refresh.`}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => reload()} className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
              Try again
            </button>
            <button onClick={() => signOut()} className="h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-canvas">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <NewProjectProvider>
      <Shell>{children}</Shell>
    </NewProjectProvider>
  );
}
