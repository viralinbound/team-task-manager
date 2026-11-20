"use client";

import { useParams } from "next/navigation";
import { ClientReport } from "@/components/ClientReport";

export default function ClientReportPage() {
  const { id } = useParams<{ id: string }>();
  return <ClientReport clientId={id} />;
}
