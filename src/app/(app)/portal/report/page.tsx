"use client";

import { useStore } from "@/lib/store";
import { ClientReport } from "@/components/ClientReport";

export default function PortalReportPage() {
  const s = useStore();
  if (!s.me.clientId) return null;
  return <ClientReport clientId={s.me.clientId} portal />;
}
