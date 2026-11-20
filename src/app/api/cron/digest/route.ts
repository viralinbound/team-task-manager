import { NextResponse } from "next/server";
import { admin, APP_URL, emailReady, layout, sendEmail, taskList } from "@/lib/email";

/**
 * Daily digest, run by Vercel Cron (vercel.json) every morning.
 * Staff: overdue, due today, due this week, team tasks waiting to be claimed.
 * Clients: work waiting for their approval.
 * Nobody gets an empty email.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Card = { id: string; board_id: string; list_id: string; title: string; due: string | null; assignee_ids: string[]; team_id: string | null; claimed_by: string | null; client_visible: boolean };

const day = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailReady()) return NextResponse.json({ skipped: "email not configured" });

  const db = admin();
  const [{ data: profiles }, { data: boards }, { data: lists }, { data: cards }] = await Promise.all([
    db.from("profiles").select("id,email,name,role,team_ids,client_id,email_digest"),
    db.from("boards").select("id,name,client_id,status"),
    db.from("lists").select("id,kind"),
    db.from("cards").select("id,board_id,list_id,title,due,assignee_ids,team_id,claimed_by,client_visible").eq("archived", false),
  ]);
  if (!profiles || !boards || !lists || !cards) return NextResponse.json({ error: "load failed" }, { status: 500 });

  const kind = new Map(lists.map((l) => [l.id as string, l.kind as string | null]));
  const board = new Map(boards.map((b) => [b.id as string, b]));
  const open = (cards as Card[]).filter((c) => kind.get(c.list_id) !== "done" && board.get(c.board_id)?.status !== "completed");

  const now = new Date(Date.now() + 5.5 * 3600 * 1000); // India time
  const today = day(now);
  const weekEnd = day(new Date(now.getTime() + 7 * 86400000));
  const link = (c: Card, client = false) => `${APP_URL}${client ? "/portal" : ""}/boards/${c.board_id}?card=${c.id}`;
  const meta = (c: Card, extra?: string) => [board.get(c.board_id)?.name, extra].filter(Boolean).join(" · ");

  let sent = 0;
  const errors: string[] = [];
  for (const p of profiles) {
    if (!p.email || !p.email_digest || p.role === "viewer") continue;
    let blocks: string[] = [];
    let heading = "";

    if (p.role === "client") {
      const waiting = open.filter((c) => c.client_visible && kind.get(c.list_id) === "approval" && board.get(c.board_id)?.client_id === p.client_id);
      if (!waiting.length) continue;
      heading = `${waiting.length} item${waiting.length > 1 ? "s" : ""} waiting for your approval`;
      blocks = [taskList("Waiting for you", waiting.map((c) => ({ title: c.title, meta: meta(c), href: link(c, true) })))];
    } else {
      const mine = open.filter((c) => c.assignee_ids.includes(p.id));
      const overdue = mine.filter((c) => c.due && c.due < today);
      const dueToday = mine.filter((c) => c.due === today);
      const thisWeek = mine.filter((c) => c.due && c.due > today && c.due <= weekEnd);
      const toClaim = open.filter((c) => c.team_id && !c.claimed_by && (p.team_ids ?? []).includes(c.team_id));
      if (!overdue.length && !dueToday.length && !thisWeek.length && !toClaim.length) continue;
      heading = `Your day: ${dueToday.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`;
      blocks = [
        taskList("Overdue", overdue.map((c) => ({ title: c.title, meta: meta(c, `was due ${fmt(c.due!)}`), href: link(c) })), "#b42318"),
        taskList("Due today", dueToday.map((c) => ({ title: c.title, meta: meta(c), href: link(c) })), "#b7791f"),
        taskList("Later this week", thisWeek.map((c) => ({ title: c.title, meta: meta(c, `due ${fmt(c.due!)}`), href: link(c) }))),
        taskList("Team tasks to claim", toClaim.map((c) => ({ title: c.title, meta: meta(c), href: link(c) })), "#1f6f5c"),
      ];
    }

    const first = (p.name || "").split(" ")[0];
    try {
      await sendEmail(
        p.email,
        heading,
        layout({ heading, intro: first ? `Good morning, ${first}. Here's what needs you today.` : "Here's what needs you today.", blocks, cta: { label: "Open Workboard", href: `${APP_URL}${p.role === "client" ? "/portal" : "/my"}` } }),
        `${heading}\n\nOpen Workboard: ${APP_URL}${p.role === "client" ? "/portal" : "/my"}`,
      );
      sent++;
    } catch (e) {
      errors.push(`${p.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (errors.length) console.error("[cron/digest]", errors);
  return NextResponse.json({ sent, failed: errors.length });
}
