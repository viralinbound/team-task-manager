import { NextResponse } from "next/server";
import { admin, APP_URL, emailReady, layout, sendEmail } from "@/lib/email";

/**
 * Called by the database (pg_net trigger) when an important notification is created.
 * Looks the notification up itself, so the request body can't be used to send arbitrary email.
 */
const SUBJECT: Record<string, string> = {
  assigned: "New task for you",
  mention: "You were mentioned",
  approval: "Approval update",
  request: "New client request",
};

export async function POST(req: Request) {
  const secret = process.env.EMAIL_HOOK_SECRET;
  if (!secret || req.headers.get("x-hook-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailReady()) return NextResponse.json({ skipped: "email not configured" });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const db = admin();
  const { data: n } = await db.from("notifications").select("id,user_id,text,href,kind,created_at").eq("id", id).maybeSingle();
  if (!n || !SUBJECT[n.kind]) return NextResponse.json({ skipped: "not emailable" });
  // Only fresh ones: protects against replays of an old id.
  if (Date.now() - new Date(n.created_at).getTime() > 10 * 60 * 1000) return NextResponse.json({ skipped: "stale" });

  const { data: p } = await db.from("profiles").select("email,name,role,email_alerts").eq("id", n.user_id).maybeSingle();
  if (!p?.email || !p.email_alerts || p.role === "viewer") return NextResponse.json({ skipped: "opted out" });

  const href = `${APP_URL}${n.href.startsWith("/") ? n.href : "/"}`;
  try {
    await sendEmail(
      p.email,
      `${SUBJECT[n.kind]}: ${n.text.replace(/^.*?“|”.*$/g, "").slice(0, 70) || "Workboard"}`,
      layout({ heading: SUBJECT[n.kind], intro: n.text, cta: { label: "Open in Workboard", href } }),
      `${n.text}\n\nOpen: ${href}\n\nTurn these emails off in Workboard → Settings.`,
    );
  } catch (e) {
    console.error("[email/notification]", e);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
