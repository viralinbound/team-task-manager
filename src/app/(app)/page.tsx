"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Board } from "@/lib/types";
import { cn, dueState, greeting } from "@/lib/format";
import { AvatarStack, Button, Field, Icon, inputCls, Modal, PageHeader, Progress } from "@/components/ui";

const SWATCHES = ["#1f6f5c", "#3f6db3", "#b4537a", "#b7791f", "#8a5a3b", "#2f7d4f", "#6d5bd0", "#c2410c"];

export default function Home() {
  const s = useStore();
  const { visibleBoards, clientById, isDone } = useHelpers();
  const [creating, setCreating] = useState(false);

  const mine = s.cards.filter((c) => !c.archived && c.assigneeIds.includes(s.me.id) && !isDone(c));
  const overdue = mine.filter((c) => dueState(c.due) === "overdue").length;
  const today = mine.filter((c) => dueState(c.due) === "today").length;
  const waiting = s.cards.filter((c) => !c.archived && c.teamId && !c.claimedBy && s.me.teamIds.includes(c.teamId)).length;

  const starred = visibleBoards.filter((b) => b.starred);
  const groups = new Map<string, Board[]>();
  visibleBoards.forEach((b) => {
    const k = b.clientId ?? "internal";
    groups.set(k, [...(groups.get(k) ?? []), b]);
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} title={`${greeting()}, ${s.me.name.split(" ")[0]}`}>
        {s.me.role !== "viewer" && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New board
          </Button>
        )}
      </PageHeader>

      {/* today strip */}
      <Link href="/my" className="group mb-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line grid-cols-2 sm:grid-cols-4">
        {[
          { n: mine.length, l: "Open tasks for you", tone: "text-ink" },
          { n: today, l: "Due today", tone: today ? "text-high" : "text-ink" },
          { n: overdue, l: "Overdue", tone: overdue ? "text-urgent" : "text-ink" },
          { n: waiting, l: "Team tasks to claim", tone: waiting ? "text-brand" : "text-ink" },
        ].map((x) => (
          <div key={x.l} className="bg-surface px-5 py-4 transition-colors group-hover:bg-canvas/40">
            <p className={cn("font-display text-3xl font-semibold", x.tone)}>{x.n}</p>
            <p className="mt-0.5 text-xs font-medium text-muted">{x.l}</p>
          </div>
        ))}
      </Link>

      {starred.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Icon name="star" size={16} className="text-high" /> Starred
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {starred.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}
          </div>
        </section>
      )}

      {[...groups.entries()].map(([key, list]) => {
        const c = clientById(key);
        return (
          <section key={key} className="mb-10">
            <div className="mb-3 flex items-center gap-3">
              {c?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" className="h-7 w-7 rounded-md object-cover" />
              )}
              <h2 className="text-sm font-semibold text-ink-soft">{c ? c.name : "Internal"}</h2>
              {c && <span className="text-xs text-faint">{c.industry}</span>}
              {c && s.me.role === "admin" && (
                <Link href={`/clients/${c.id}`} className="ml-auto text-xs font-semibold text-brand hover:underline">
                  Client page →
                </Link>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => (
                <BoardCard key={b.id} board={b} />
              ))}
            </div>
          </section>
        );
      })}

      <NewBoard open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function BoardCard({ board }: { board: Board }) {
  const s = useStore();
  const { userById, isDone, clientById } = useHelpers();
  const cards = s.cards.filter((c) => c.boardId === board.id && !c.archived);
  const done = cards.filter(isDone).length;
  const overdue = cards.filter((c) => !isDone(c) && dueState(c.due) === "overdue").length;
  const client = clientById(board.clientId);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[0_10px_30px_-14px_rgba(29,28,26,.35)]">
      <Link href={`/boards/${board.id}`} className="block">
        {board.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={board.cover} alt="" loading="lazy" className="block h-28 w-full object-cover" />
        ) : (
          <div className="h-1.5" style={{ background: board.color }} />
        )}
      </Link>
      <Link href={`/boards/${board.id}`} className="block p-4 pb-3.5">
        <p className="font-semibold text-ink">{board.name}</p>
        <p className="mt-0.5 text-xs text-muted">{client?.name ?? "Internal board"}</p>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted">
            {done}/{cards.length} done
            {overdue > 0 && <span className="ml-2 font-semibold text-urgent">· {overdue} overdue</span>}
          </span>
          <AvatarStack users={board.memberIds.map(userById)} size={22} max={4} />
        </div>
        <Progress value={cards.length ? done / cards.length : 0} className="mt-2.5" />
      </Link>
      <button
        onClick={() => s.toggleStar(board.id)}
        className={cn("absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-surface/90 shadow-sm transition-opacity", board.starred ? "text-high" : "text-muted opacity-0 group-hover:opacity-100 hover:text-high")}
        aria-label={board.starred ? "Unstar" : "Star"}
      >
        <Icon name="star" size={16} fill={board.starred} />
      </button>
    </div>
  );
}

function NewBoard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [members, setMembers] = useState<string[]>([s.me.id]);
  const staff = s.users.filter((u) => u.role !== "client");

  return (
    <Modal open={open} onClose={onClose} label="New board" width="max-w-lg">
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = s.addBoard({ name: name.trim(), clientId: clientId || undefined, color, memberIds: Array.from(new Set([...members, s.me.id])) });
          onClose();
          setName("");
          router.push(`/boards/${id}`);
        }}
      >
        <h2 className="font-display text-2xl font-semibold">New board</h2>
        <p className="mt-1 text-sm text-muted">One board per project. Client boards get Requests and Client Approval lists automatically.</p>
        <div className="mt-6 space-y-4">
          <Field label="Board name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" className={inputCls} />
          </Field>
          <Field label="Client">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
              <option value="">Internal (no client)</option>
              {s.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Colour">
            <div className="flex gap-2">
              {SWATCHES.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full ring-offset-2 ring-offset-surface", color === c && "ring-2 ring-ink")} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </Field>
          <Field label="Members">
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {staff.map((u) => {
                const on = members.includes(u.id);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setMembers((m) => (on ? m.filter((x) => x !== u.id) : [...m, u.id]))}
                    className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", on ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-muted hover:border-line-strong")}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Create board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
