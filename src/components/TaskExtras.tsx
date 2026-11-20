"use client";

import { useEffect, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Card, FieldDef, FieldValue } from "@/lib/types";
import { cn } from "@/lib/format";
import { Avatar, Button, Icon, inputCls } from "./ui";

/* ---------------- custom fields ---------------- */

export function fieldText(f: FieldDef, v: FieldValue | undefined): string {
  if (v === undefined || v === "") return "";
  if (f.type === "checkbox") return v ? "Yes" : "No";
  if (f.type === "date") return new Date(`${v}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (f.type === "number") return Number(v).toLocaleString("en-IN");
  return String(v);
}

export function FieldInput({ f, value, onChange, compact }: { f: FieldDef; value: FieldValue | undefined; onChange: (v: FieldValue | undefined) => void; compact?: boolean }) {
  const cls = compact ? "h-8 w-full min-w-[7rem] rounded-lg border border-line bg-surface px-2 text-xs" : inputCls;
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);

  switch (f.type) {
    case "checkbox":
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked || undefined)} className="h-4 w-4 accent-[var(--color-brand)]" aria-label={f.name} />;
    case "select":
      return (
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={cls} aria-label={f.name}>
          <option value="">—</option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "date":
      return <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={cls} aria-label={f.name} />;
    default:
      // text / number: save when the box loses focus, not on every key
      return (
        <input
          type={f.type === "number" ? "number" : "text"}
          inputMode={f.type === "number" ? "decimal" : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = draft.trim() === "" ? undefined : f.type === "number" ? Number(draft) : draft.trim();
            if (v !== value && !(typeof v === "number" && Number.isNaN(v))) onChange(v);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className={cls}
          aria-label={f.name}
        />
      );
  }
}

export function CustomFields({ card, canEdit }: { card: Card; canEdit: boolean }) {
  const s = useStore();
  const fields = s.boards.find((b) => b.id === card.boardId)?.fields ?? [];
  if (!fields.length) return null;
  const shown = canEdit ? fields : fields.filter((f) => card.custom?.[f.id] !== undefined);
  if (!shown.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Details</h3>
      <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {shown.map((f) => (
          <div key={f.id} className={cn("min-w-0", f.type === "checkbox" && "flex items-center gap-2")}>
            <dt className={cn("text-xs font-semibold text-ink-soft", f.type !== "checkbox" && "mb-1")}>{f.name}</dt>
            <dd className={f.type === "checkbox" ? "order-first" : undefined}>
              {canEdit ? <FieldInput f={f} value={card.custom?.[f.id]} onChange={(v) => s.setCustom(card.id, f.id, v)} /> : <span className="text-sm">{fieldText(f, card.custom?.[f.id])}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------- time tracking ---------------- */

const TIMER_KEY = "workboard-timer";
type Running = { cardId: string; startedAt: number };

export const hm = (min: number) => (min < 60 ? `${min}m` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`);

/** One running timer per browser, kept across page loads. */
function useTimer() {
  const [running, setRunning] = useState<Running | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) setRunning(JSON.parse(raw));
    } catch {}
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const save = (r: Running | null) => {
    setRunning(r);
    try {
      if (r) localStorage.setItem(TIMER_KEY, JSON.stringify(r));
      else localStorage.removeItem(TIMER_KEY);
    } catch {}
  };
  return { running, save };
}

/** Parse "1h 30m", "1:30", "90", "1.5h" into minutes. */
export function parseDuration(text: string): number {
  const t = text.trim().toLowerCase();
  if (!t) return 0;
  const colon = t.match(/^(\d+):(\d{1,2})$/);
  if (colon) return +colon[1] * 60 + +colon[2];
  let total = 0;
  const h = t.match(/(\d+(?:\.\d+)?)\s*h/);
  const m = t.match(/(\d+)\s*m/);
  if (h) total += parseFloat(h[1]) * 60;
  if (m) total += +m[1];
  if (!h && !m && /^\d+(\.\d+)?$/.test(t)) total = parseFloat(t);
  return Math.round(total);
}

export function TimeTracker({ card }: { card: Card }) {
  const s = useStore();
  const { userById } = useHelpers();
  const { running, save } = useTimer();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const entries = s.timeEntries.filter((e) => e.cardId === card.id);
  const total = entries.reduce((n, e) => n + e.minutes, 0);
  const mine = entries.filter((e) => e.userId === s.me.id).reduce((n, e) => n + e.minutes, 0);
  const here = running?.cardId === card.id;
  const elapsed = here ? Math.floor((Date.now() - running!.startedAt) / 1000) : 0;
  const otherTask = running && !here ? s.cards.find((c) => c.id === running.cardId) : undefined;

  const stop = () => {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    s.logTime(card.id, minutes, note.trim() || "Timer");
    save(null);
    setNote("");
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">Time</h3>
        <span className="text-xs text-muted">
          {hm(total)} total{mine && mine !== total ? ` · ${hm(mine)} yours` : ""} · <Icon name="lock" size={11} className="inline" /> team only
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {here ? (
          <Button type="button" variant="danger" size="sm" onClick={stop}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Stop · {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (otherTask && !confirm(`A timer is running on “${otherTask.title}”. Stop it without saving and start here?`)) return;
              save({ cardId: card.id, startedAt: Date.now() });
            }}
          >
            <Icon name="clock" size={14} /> Start timer
          </Button>
        )}
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const m = parseDuration(amount);
            if (m < 1 || m > 1440) return setError("Enter time like 45m, 1h 30m or 1:30 (max 24h).");
            s.logTime(card.id, m, note.trim());
            setAmount("");
            setNote("");
            setError("");
          }}
        >
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1h 30m" className="h-8 w-20 rounded-lg border border-line bg-surface px-2 text-xs" aria-label="Time spent" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do? (optional)" className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-xs" aria-label="Note" />
          <Button type="submit" variant="outline" size="sm">
            Log
          </Button>
        </form>
      </div>
      {error && <p className="mt-1.5 text-xs text-urgent">{error}</p>}
      {otherTask && <p className="mt-1.5 text-[11px] text-high">Timer running on “{otherTask.title}”.</p>}

      {entries.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {entries.slice(0, 8).map((e) => (
            <li key={e.id} className="group flex items-center gap-2.5 px-3 py-2 text-xs">
              <Avatar user={userById(e.userId)} size={20} />
              <span className="w-14 shrink-0 font-semibold">{hm(e.minutes)}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{e.note || "—"}</span>
              <span className="shrink-0 text-faint">{new Date(`${e.spentOn}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              {(e.userId === s.me.id || s.me.role === "admin") && (
                <button onClick={() => s.removeTime(e.id)} className="rounded p-0.5 text-faint opacity-0 group-hover:opacity-100 hover:text-urgent focus:opacity-100" aria-label="Remove entry">
                  <Icon name="x" size={13} />
                </button>
              )}
            </li>
          ))}
          {entries.length > 8 && <li className="px-3 py-1.5 text-[11px] text-faint">+{entries.length - 8} older entries</li>}
        </ul>
      )}
    </section>
  );
}
