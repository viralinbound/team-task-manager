"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Card } from "@/lib/types";
import { Button, Icon, Progress } from "./ui";

const DAY = 86_400_000;
const fmt = (d: Date | string) => new Date(typeof d === "string" && d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * Weekly progress report for one client: what was finished, what's in progress,
 * what's waiting on them, and what's coming up. Printable / save-as-PDF.
 * Only client-visible tasks are included, so the same page is safe to show the client.
 */
export function ClientReport({ clientId, portal }: { clientId: string; portal?: boolean }) {
  const s = useStore();
  const { clientById, listById } = useHelpers();
  const client = clientById(clientId);
  const end = new Date();
  const start = new Date(end.getTime() - 7 * DAY);
  const startIso = start.toISOString();
  const soon = new Date(end.getTime() + 14 * DAY).toLocaleDateString("en-CA");
  const today = end.toLocaleDateString("en-CA");

  const projects = useMemo(() => s.boards.filter((b) => b.clientId === clientId && b.status !== "completed"), [s.boards, clientId]);

  const sections = projects.map((b) => {
    const cards = s.cards.filter((c) => c.boardId === b.id && !c.archived && c.clientVisible);
    const kind = (c: Card) => listById(c.listId)?.kind;
    const lastMove = (c: Card) => c.history.find((h) => /moved this to|approved/i.test(h.text))?.at ?? c.createdAt;
    const done = cards.filter((c) => kind(c) === "done");
    const doneWeek = done.filter((c) => lastMove(c) >= startIso);
    const waiting = cards.filter((c) => kind(c) === "approval");
    const doing = cards.filter((c) => !kind(c) && listById(c.listId)?.name.toLowerCase() !== "to do");
    const upcoming = cards.filter((c) => kind(c) !== "done" && c.due && c.due >= today && c.due <= soon).sort((a, c) => a.due!.localeCompare(c.due!));
    const late = cards.filter((c) => kind(c) !== "done" && c.due && c.due < today);
    const requests = s.requests.filter((r) => r.boardId === b.id && r.at >= startIso);
    return { b, total: cards.length, done: done.length, doneWeek, waiting, doing, upcoming, late, requests };
  });

  if (!client) return <p className="text-sm text-muted">Client not found.</p>;
  const totals = sections.reduce((t, x) => ({ done: t.done + x.doneWeek.length, waiting: t.waiting + x.waiting.length, upcoming: t.upcoming + x.upcoming.length }), { done: 0, waiting: 0, upcoming: 0 });

  const List = ({ title, items, empty, tone, extra }: { title: string; items: Card[]; empty: string; tone?: string; extra?: (c: Card) => string }) => (
    <div className="break-inside-avoid">
      <h4 className={`mb-1.5 text-[11px] font-semibold tracking-wide uppercase ${tone ?? "text-faint"}`}>
        {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-faint">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id} className="flex items-baseline gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
              <span className="min-w-0 flex-1">{c.title}</span>
              {extra && <span className="shrink-0 text-xs text-muted">{extra(c)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <Link href={portal ? "/portal" : `/clients/${clientId}`} className="text-xs font-semibold text-brand hover:underline">
          ← {portal ? "My projects" : client.name}
        </Link>
        <Button variant="outline" className="ml-auto" onClick={() => window.print()}>
          <Icon name="download" size={16} /> Print or save as PDF
        </Button>
      </div>

      <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex items-start gap-4 border-b border-line pb-5">
          {client.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">Weekly report</p>
            <h1 className="font-display text-[28px] leading-tight font-semibold">{client.name}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {fmt(start)} – {fmt(end)} {end.getFullYear()}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3 py-5 text-center">
          {[
            [totals.done, "finished this week", "text-ok"],
            [totals.waiting, "waiting for your approval", totals.waiting ? "text-high" : ""],
            [totals.upcoming, "due in the next 2 weeks", ""],
          ].map(([n, l, tone]) => (
            <div key={l as string} className="rounded-xl bg-canvas px-2 py-3">
              <p className={`font-display text-3xl font-semibold ${tone}`}>{n}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted">{l}</p>
            </div>
          ))}
        </div>

        {sections.length === 0 && <p className="py-6 text-center text-sm text-muted">No active projects.</p>}

        <div className="space-y-6">
          {sections.map((x) => (
            <section key={x.b.id} className="break-inside-avoid border-t border-line pt-5">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">{x.b.name}</h2>
                <span className="text-xs text-muted">
                  {x.done}/{x.total} tasks done{x.b.dueDate ? ` · deadline ${fmt(x.b.dueDate)}` : ""}
                </span>
                <Progress value={x.total ? x.done / x.total : 0} className="ml-auto w-28" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <List title="Finished this week" items={x.doneWeek} empty="Nothing finished this week." tone="text-ok" />
                <List title="In progress" items={x.doing} empty="Nothing in progress right now." />
                <List title="Waiting for your approval" items={x.waiting} empty="Nothing waiting on you." tone={x.waiting.length ? "text-high" : undefined} />
                <List title="Coming up" items={x.upcoming} empty="Nothing due in the next 2 weeks." extra={(c) => `due ${fmt(c.due!)}`} />
                {x.late.length > 0 && <List title="Running late" items={x.late} empty="" tone="text-urgent" extra={(c) => `was due ${fmt(c.due!)}`} />}
              </div>
              {x.requests.length > 0 && (
                <p className="mt-3 text-xs text-muted">
                  {x.requests.length} new request{x.requests.length > 1 ? "s" : ""} this week: {x.requests.map((r) => `“${r.title}”`).join(", ")}
                </p>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-[11px] text-faint">Prepared {end.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} from Workboard.</footer>
      </article>
    </div>
  );
}
