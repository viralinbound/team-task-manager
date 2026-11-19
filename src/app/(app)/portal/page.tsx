"use client";

import Link from "next/link";
import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { cn, shortDate, timeAgo } from "@/lib/format";
import { CardModal } from "@/components/CardModal";
import { Avatar, Empty, Icon, Panel, PriorityPill, Progress } from "@/components/ui";

export default function PortalHome() {
  const s = useStore();
  const { clientById, isDone, userById, boardById } = useHelpers();
  const [openId, setOpenId] = useState<string | null>(null);
  const client = clientById(s.me.clientId);
  if (!client) return <Empty title="No client linked to this login" />;

  const boards = s.boards.filter((b) => b.clientId === client.id);
  const cards = s.cards.filter((c) => !c.archived && c.clientVisible && boards.some((b) => b.id === c.boardId));
  const approvals = cards.filter((c) => s.lists.find((l) => l.id === c.listId)?.kind === "approval");
  const requests = s.requests.filter((r) => r.clientId === client.id);
  const updates = s.activity.filter((a) => boards.some((b) => b.id === a.boardId)).filter((a) => {
    // hide updates about internal-only cards
    return !s.cards.some((c) => !c.clientVisible && a.text.includes(c.title));
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-ink px-6 py-8 text-canvas sm:px-10 sm:py-10">
        {boards[0]?.cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={boards[0].cover.replace("/640/260", "/1400/520")} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
          </>
        )}
        <div className="relative">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-canvas/70 uppercase">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {client.image && <img src={client.image} alt="" className="h-6 w-6 rounded-md object-cover" />}
          {client.name}
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold sm:text-4xl">Hello {s.me.name.split(" ")[0]}, here&apos;s where your projects stand.</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal/request" className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-lg bg-canvas px-4 text-sm font-semibold text-ink hover:bg-white">
            <Icon name="plus" size={16} /> New request
          </Link>
          {approvals.length > 0 && (
            <span className="inline-flex items-center gap-2 rounded-lg bg-canvas/10 px-3.5 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-high" /> {approvals.length === 1 ? "1 item needs" : `${approvals.length} items need`} your approval
            </span>
          )}
        </div>
        </div>
      </div>

      {approvals.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold">Waiting for your approval</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {approvals.map((c) => (
              <button key={c.id} onClick={() => setOpenId(c.id)} className="flex items-center gap-4 rounded-2xl border-2 border-brand/30 bg-surface p-3 text-left hover:border-brand">
                {c.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon name="check" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.title}</span>
                  <span className="text-xs text-muted">
                    {boardById(c.boardId)?.name} · from {userById(c.assigneeIds[0])?.name.split(" ")[0] ?? "the team"}
                  </span>
                </span>
                <span className="text-xs font-semibold text-brand">Review →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Your projects</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {boards.map((b) => {
            const bc = cards.filter((c) => c.boardId === b.id);
            const d = bc.filter(isDone).length;
            const doing = bc.filter((c) => s.lists.find((l) => l.id === c.listId)?.name === "In Progress").length;
            return (
              <Link key={b.id} href={`/portal/boards/${b.id}`} className="overflow-hidden rounded-2xl border border-line bg-surface hover:shadow-[0_10px_30px_-14px_rgba(29,28,26,.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.cover && <img src={b.cover} alt="" className="block h-32 w-full object-cover" />}
                <div className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{b.name}</p>
                  <span className="font-display text-2xl font-semibold">{bc.length ? Math.round((d / bc.length) * 100) : 0}%</span>
                </div>
                <Progress value={bc.length ? d / bc.length : 0} className="mt-3" />
                <p className="mt-3 text-xs text-muted">
                  {d} done · {doing} in progress · {bc.length - d - doing} to start
                </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Your requests" action={<Link href="/portal/request" className="text-xs font-semibold text-brand hover:underline">+ New</Link>}>
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="text-xs text-muted">
                    Sent {timeAgo(r.at)}
                    {r.wantedBy && ` · wanted by ${shortDate(r.wantedBy)}`}
                  </span>
                </span>
                <PriorityPill p={r.priority} compact />
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.status === "new" ? "bg-high-soft text-high" : r.status === "accepted" ? "bg-ok-soft text-ok" : "bg-sunken text-muted")}>
                  {r.status === "new" ? "Received" : r.status === "accepted" ? "Accepted" : "Declined"}
                </span>
              </li>
            ))}
            {requests.length === 0 && <li className="px-5 py-6 text-sm text-muted">No requests yet.</li>}
          </ul>
        </Panel>

        <Panel title="Latest updates">
          <ul className="space-y-4 px-5 py-4">
            {updates.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <Avatar user={userById(a.userId)} size={26} />
                <p className="leading-snug text-ink-soft">
                  <span className="font-semibold text-ink">{userById(a.userId)?.name.split(" ")[0]}</span> {a.text}
                  <span className="block text-xs text-faint">{timeAgo(a.at)}</span>
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <CardModal cardId={openId} onClose={() => setOpenId(null)} client />
    </div>
  );
}
