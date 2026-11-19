"use client";

import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Card } from "@/lib/types";
import { cn, dueState, PRIORITY } from "@/lib/format";
import { CardModal } from "@/components/CardModal";
import { AvatarStack, Button, Chip, DueChip, Empty, Icon, PageHeader, PriorityPill } from "@/components/ui";

const GROUPS = [
  { key: "overdue", label: "Overdue", tone: "text-urgent" },
  { key: "today", label: "Today", tone: "text-high" },
  { key: "soon", label: "Next few days", tone: "text-ink" },
  { key: "later", label: "Later", tone: "text-ink" },
  { key: "none", label: "No date", tone: "text-muted" },
] as const;

export default function MyTasks() {
  const s = useStore();
  const { isDone, boardById, clientById, teamById, userById } = useHelpers();
  const [tab, setTab] = useState<"mine" | "claim" | "assigned">("mine");
  const [client, setClient] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const live = s.cards.filter((c) => !c.archived && (!client || boardById(c.boardId)?.clientId === client));
  const mine = live.filter((c) => c.assigneeIds.includes(s.me.id) && !isDone(c));
  const claim = live.filter((c) => c.teamId && !c.claimedBy && s.me.teamIds.includes(c.teamId));
  const byMe = live.filter((c) => c.assignedBy === s.me.id && !c.assigneeIds.includes(s.me.id) && c.assigneeIds.length > 0);
  const doneWeek = s.cards.filter((c) => c.assigneeIds.includes(s.me.id) && isDone(c)).length;

  const sortP = (a: Card, b: Card) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || (a.due ?? "9").localeCompare(b.due ?? "9");

  const Row = ({ c, extra }: { c: Card; extra?: React.ReactNode }) => {
    const b = boardById(c.boardId);
    return (
      <li>
        <button onClick={() => setOpenId(c.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-left hover:bg-canvas/60">
          <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: b?.color }} />
          <span className="min-w-0 flex-1 basis-60">
            <span className="block truncate text-sm font-medium text-ink">{c.title}</span>
            <span className="block truncate text-xs text-muted">
              {clientById(b?.clientId)?.name ?? "Internal"} · {b?.name}
            </span>
          </span>
          {extra}
          <PriorityPill p={c.priority} compact />
          <span className="w-28 text-right">
            <DueChip due={c.due} done={isDone(c)} compact />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="My dashboard" title="My tasks" sub="Everything assigned to you, across every project." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { n: mine.length, l: "Open", c: "" },
          { n: mine.filter((c) => dueState(c.due) === "today").length, l: "Due today", c: "text-high" },
          { n: mine.filter((c) => dueState(c.due) === "overdue").length, l: "Overdue", c: "text-urgent" },
          { n: doneWeek, l: "Done", c: "text-ok" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl border border-line bg-surface px-4 py-3.5">
            <p className={cn("font-display text-[28px] leading-none font-semibold", x.c)}>{x.n}</p>
            <p className="mt-1.5 text-xs font-medium text-muted">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {(
            [
              ["mine", `Assigned to me (${mine.length})`],
              ["claim", `Team tasks to claim (${claim.length})`],
              ["assigned", `Assigned by me (${byMe.length})`],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", tab === k ? "bg-ink text-canvas" : "text-ink-soft hover:bg-sunken")}>
              {l}
            </button>
          ))}
        </div>
        <select value={client} onChange={(e) => setClient(e.target.value)} className="ml-auto h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink-soft">
          <option value="">All clients</option>
          {s.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {tab === "mine" &&
        (mine.length === 0 ? (
          <Empty title="Nothing on your plate" sub="When someone assigns you a task it shows up here." />
        ) : (
          <div className="space-y-5">
            {GROUPS.map((g) => {
              const items = mine.filter((c) => dueState(c.due) === g.key).sort(sortP);
              if (!items.length) return null;
              return (
                <section key={g.key} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <h2 className={cn("border-b border-line px-5 py-2.5 text-xs font-semibold tracking-wide uppercase", g.tone)}>
                    {g.label} <span className="text-faint">· {items.length}</span>
                  </h2>
                  <ul className="divide-y divide-line">
                    {items.map((c) => (
                      <Row key={c.id} c={c} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ))}

      {tab === "claim" &&
        (claim.length === 0 ? (
          <Empty title="No team tasks waiting" sub="Tasks given to your whole team appear here until someone claims them." />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <ul className="divide-y divide-line">
              {claim.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Chip color={teamById(c.teamId)?.color}>{teamById(c.teamId)?.name}</Chip>
                  <button onClick={() => setOpenId(c.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline">
                    {c.title}
                  </button>
                  <DueChip due={c.due} compact />
                  <Button size="sm" onClick={() => s.claim(c.id)}>
                    Claim
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {tab === "assigned" &&
        (byMe.length === 0 ? (
          <Empty title="You haven't assigned anything yet" />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <ul className="divide-y divide-line">
              {byMe.sort(sortP).map((c) => (
                <Row
                  key={c.id}
                  c={c}
                  extra={
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <Icon name="arrow" size={13} />
                      <AvatarStack users={c.assigneeIds.map(userById)} size={22} />
                      <span className="hidden sm:inline">{s.lists.find((l) => l.id === c.listId)?.name}</span>
                    </span>
                  }
                />
              ))}
            </ul>
          </section>
        ))}

      <CardModal cardId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
