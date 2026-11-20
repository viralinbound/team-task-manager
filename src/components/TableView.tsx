"use client";

import { useMemo, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Card, Priority } from "@/lib/types";
import { cn, PRIORITY } from "@/lib/format";
import { AvatarStack, DueChip, Icon, PriorityPill } from "./ui";

type Key = "title" | "status" | "due" | "priority" | "owner";
const PRIO_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Every task in a sortable table. Status and due date can be changed in place. */
export function TableView({ cards, onOpen, canEdit, showProject }: { cards: Card[]; onOpen: (id: string) => void; canEdit: boolean; showProject?: boolean }) {
  const s = useStore();
  const { userById, listById, labelById, boardById, isDone } = useHelpers();
  const [sort, setSort] = useState<{ key: Key; asc: boolean }>({ key: "status", asc: true });

  const listPos = useMemo(() => {
    const m = new Map<string, number>();
    const perBoard = new Map<string, number>();
    s.lists.forEach((l) => {
      const n = perBoard.get(l.boardId) ?? 0;
      m.set(l.id, n);
      perBoard.set(l.boardId, n + 1);
    });
    return m;
  }, [s.lists]);

  const rows = useMemo(() => {
    const val = (c: Card): string | number => {
      switch (sort.key) {
        case "title":
          return c.title.toLowerCase();
        case "status":
          return (listPos.get(c.listId) ?? 0) * 10000 + c.order;
        case "due":
          return c.due ?? "9999";
        case "priority":
          return PRIO_RANK[c.priority];
        case "owner":
          return userById(c.assigneeIds[0])?.name.toLowerCase() ?? "zzz";
      }
    };
    return [...cards].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.asc ? 1 : -1);
    });
  }, [cards, sort, listPos, userById]);

  const Th = ({ k, children, className }: { k: Key; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 py-2.5 font-semibold", className)}>
      <button onClick={() => setSort((p) => ({ key: k, asc: p.key === k ? !p.asc : true }))} className="inline-flex items-center gap-1 hover:text-ink">
        {children}
        {sort.key === k && <span aria-hidden>{sort.asc ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  if (!rows.length) return <p className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">No tasks match.</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-wide text-faint uppercase">
            <Th k="title" className="pl-5">Task</Th>
            <Th k="status">Status</Th>
            <Th k="owner">People</Th>
            <Th k="due">Due</Th>
            <Th k="priority">Priority</Th>
            <th className="px-3 py-2.5 font-semibold">Labels</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((c) => {
            const lists = s.lists.filter((l) => l.boardId === c.boardId);
            const done = isDone(c);
            const subs = c.checklist.length;
            return (
              <tr key={c.id} className="hover:bg-canvas/60">
                <td className="max-w-[22rem] py-2.5 pr-3 pl-5">
                  <button onClick={() => onOpen(c.id)} className="block w-full text-left">
                    <span className={cn("block truncate font-medium", done && "text-muted line-through")}>{c.title}</span>
                    <span className="flex items-center gap-2 text-[11px] text-faint">
                      {showProject && <span className="truncate">{boardById(c.boardId)?.name}</span>}
                      {subs > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Icon name="list" size={11} /> {c.checklist.filter((i) => i.done).length}/{subs}
                        </span>
                      )}
                      {c.repeat && (
                        <span className="inline-flex items-center gap-0.5 capitalize">
                          <Icon name="repeat" size={11} /> {c.repeat}
                        </span>
                      )}
                      {!c.clientVisible && <Icon name="lock" size={11} />}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  {canEdit ? (
                    <select
                      value={c.listId}
                      onChange={(e) => s.updateCard(c.id, { listId: e.target.value, order: -1 }, `moved this to ${listById(e.target.value)?.name}`)}
                      className="h-8 max-w-[9.5rem] rounded-lg border border-line bg-surface px-2 text-xs"
                      aria-label={`Status of ${c.title}`}
                    >
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{listById(c.listId)?.name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {c.assigneeIds.length ? <AvatarStack users={c.assigneeIds.map(userById)} size={24} /> : <span className="text-xs text-faint">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  {canEdit ? (
                    <input
                      type="date"
                      value={c.due ?? ""}
                      onChange={(e) => s.updateCard(c.id, { due: e.target.value || undefined }, "changed the due date")}
                      className="h-8 rounded-lg border border-line bg-surface px-2 text-xs"
                      aria-label={`Due date of ${c.title}`}
                    />
                  ) : (
                    <DueChip due={c.due} done={done} compact />
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <PriorityPill p={c.priority} compact />
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex flex-wrap gap-1">
                    {c.labels.map((id) => {
                      const l = labelById(id);
                      return l ? (
                        <span key={id} className="rounded px-1.5 py-px text-[10px] font-semibold text-white" style={{ background: l.color }}>
                          {l.name}
                        </span>
                      ) : null;
                    })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-5 py-2 text-[11px] text-faint">
        {rows.length} task{rows.length === 1 ? "" : "s"} · click a column name to sort · {PRIORITY.urgent.label} first when sorting by priority
      </p>
    </div>
  );
}
