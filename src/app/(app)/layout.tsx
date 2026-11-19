"use client";

import { Shell } from "@/components/Shell";
import { useStore } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { hydrated } = useStore();
  // Wait for this browser's saved demo state before drawing, so times and counts never flicker.
  if (!hydrated) return <div className="min-h-dvh bg-canvas" />;
  return <Shell>{children}</Shell>;
}
