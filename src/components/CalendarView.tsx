"use client";

import { useMemo, useState } from "react";
import { useHelpers } from "@/lib/store";
import type { Card } from "@/lib/types";
import { cn, PRIORITY } from "@/lib/format";
import { Icon } from "./ui";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Month calendar of tasks by due date. On phones it becomes a day-by-day list,
 * since seven columns don't fit.
 */
export function CalendarView({ cards, onOpen, showProject }: { cards: Card[]; onOpen: (id: string) => void; showProject?: boolean }) {
  const { isDone, boardById } = useHelpers();
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const today = iso(new Date());

  const byDay = useMemo(() => {
    const m = new Map<string, Card[]>();
    cards.forEach((c) => c.due && m.set(c.due, [...(m.get(c.due) ?? []), c]));
    return m;
  }, [cards]);
  const undated = cards.filter((c) => !c.due && !isDone(c)).length;

  // 6 weeks starting on the Monday on/before the 1st
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const inMonth = days.filter((d) => d.getMonth() === month.getMonth());
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  const Chip = ({ c }: { c: Card }) => {
    const done = isDone(c);
    const late = !done && c.due! < today;
    return (
      <button
        onClick={() => onOpen(c.id)}
        title={c.title}
        className={cn(
          "flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium",
          done ? "bg-ok-soft text-ok line-through" : late ? "bg-urgent-soft text-urgent" : "bg-sunken text-ink hover:bg-line",
        )}
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY[c.priority].dot)} />
        <span className="truncate">
          {showProject && <span className="text-faint">{boardById(c.boardId)?.name} · </span>}
          {c.title}
        </span>
        {c.repeat && <Icon name="repeat" size={11} className="ml-auto shrink-0" />}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="font-display text-lg font-semibold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-canvas" aria-label="Previous month">
            <Icon name="prev" size={16} />
          </button>
          <button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="h-8 rounded-lg border border-line px-3 text-xs font-semibold hover:bg-canvas">
            Today
          </button>
          <button onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-canvas" aria-label="Next month">
            <Icon name="next" size={16} />
          </button>
        </div>
      </div>

      {/* desktop / tablet: month grid */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-semibold tracking-wide text-faint uppercase">
          {WEEK.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const key = iso(d);
            const list = byDay.get(key) ?? [];
            const other = d.getMonth() !== month.getMonth();
            return (
              <div key={key} className={cn("min-h-[104px] min-w-0 border-line p-1.5", i % 7 !== 6 && "border-r", i < 35 && "border-b", other && "bg-canvas/50")}>
                <p className={cn("mb-1 text-right text-xs", key === today ? "font-bold text-brand" : other ? "text-faint" : "text-muted")}>
                  {key === today ? <span className="rounded-full bg-brand px-1.5 py-0.5 text-white">{d.getDate()}</span> : d.getDate()}
                </p>
                <div className="space-y-1">
                  {list.slice(0, 3).map((c) => (
                    <Chip key={c.id} c={c} />
                  ))}
                  {list.length > 3 && <p className="px-1 text-[11px] font-semibold text-muted">+{list.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* phone: agenda */}
      <ul className="divide-y divide-line sm:hidden">
        {inMonth.filter((d) => byDay.has(iso(d))).length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nothing due this month.</li>}
        {inMonth
          .filter((d) => byDay.has(iso(d)))
          .map((d) => (
            <li key={iso(d)} className="flex gap-3 px-4 py-3">
              <div className={cn("w-11 shrink-0 text-center", iso(d) === today ? "text-brand" : "text-muted")}>
                <p className="text-[10px] font-semibold uppercase">{d.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                <p className="font-display text-xl font-semibold">{d.getDate()}</p>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {byDay.get(iso(d))!.map((c) => (
                  <Chip key={c.id} c={c} />
                ))}
              </div>
            </li>
          ))}
      </ul>

      {undated > 0 && <p className="border-t border-line px-4 py-2 text-[11px] text-faint">{undated} open task{undated > 1 ? "s have" : " has"} no due date and don&apos;t appear here.</p>}
    </div>
  );
}
