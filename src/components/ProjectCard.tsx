"use client";

import Link from "next/link";
import { useHelpers, useStore } from "@/lib/store";
import type { Board } from "@/lib/types";
import { cn, dueLabel, dueState } from "@/lib/format";
import { AvatarStack, Icon, Progress } from "./ui";

export function ProjectCard({ board }: { board: Board }) {
  const s = useStore();
  const { userById, isDone, clientById } = useHelpers();
  const cards = s.cards.filter((c) => c.boardId === board.id && !c.archived);
  const done = cards.filter(isDone).length;
  const overdue = cards.filter((c) => !isDone(c) && dueState(c.due) === "overdue").length;
  const client = clientById(board.clientId);
  const deadline = board.dueDate ? dueState(board.dueDate) : "none";

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
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          {client?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.image} alt="" className="h-4 w-4 rounded object-cover" />
          )}
          {client?.name ?? "Internal project"}
          {board.status && board.status !== "active" && <span className="rounded bg-sunken px-1.5 py-px text-[10px] font-semibold capitalize">{board.status.replace("-", " ")}</span>}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted">
            {done}/{cards.length} done
            {overdue > 0 && <span className="ml-2 font-semibold text-urgent">· {overdue} overdue</span>}
          </span>
          <AvatarStack users={board.memberIds.map(userById)} size={22} max={4} />
        </div>
        <Progress value={cards.length ? done / cards.length : 0} className="mt-2.5" />
        {board.dueDate && (
          <p className={cn("mt-2.5 flex items-center gap-1 text-[11px] font-medium", deadline === "overdue" ? "text-urgent" : deadline === "today" || deadline === "soon" ? "text-high" : "text-muted")}>
            <Icon name="calendar" size={12} />
            {deadline === "overdue" ? `Deadline passed · ${dueLabel(board.dueDate)}` : `Deadline ${new Date(board.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          </p>
        )}
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

/** The dashed "add" tile that sits at the end of a project grid. */
export function AddProjectTile({ onClick, label = "New project" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface shadow-sm">
        <Icon name="plus" size={20} />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
