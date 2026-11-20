"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHelpers, useStore } from "@/lib/store";
import type { Attachment, Card } from "@/lib/types";
import { cn, timeAgo } from "@/lib/format";
import { Avatar, Button, Icon } from "./ui";

/**
 * Design proofing: show an image full-size and let people click a spot to leave a numbered comment.
 * Clients can pin feedback on work they can see; the team can also leave internal pins.
 */
export function ProofViewer({ card, attachment, onClose }: { card: Card; attachment: Attachment; onClose: () => void }) {
  const s = useStore();
  const { userById } = useHelpers();
  const [src, setSrc] = useState(attachment.thumb ?? attachment.url ?? "");
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const img = useRef<HTMLDivElement>(null);
  const client = s.me.role === "client";
  const staff = s.me.role === "admin" || s.me.role === "member";

  useEffect(() => {
    let on = true;
    s.fileUrl(attachment).then((u) => on && u && setSrc(u)).catch(() => {});
    // capture + stop so Escape closes only this viewer, not the task behind it
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (draft) setDraft(null);
      else onClose();
    };
    window.addEventListener("keydown", key, true);
    document.body.style.overflow = "hidden";
    return () => {
      on = false;
      window.removeEventListener("keydown", key, true);
      document.body.style.overflow = "hidden"; // the task modal underneath is still open
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id, draft]);

  const all = s.pins.filter((p) => p.attachmentId === attachment.id && p.cardId === card.id && (!client || !p.internal)).sort((a, b) => a.at.localeCompare(b.at));
  const number = new Map(all.map((p, i) => [p.id, i + 1]));
  const pins = all.filter((p) => showResolved || !p.resolved);
  const open = all.filter((p) => !p.resolved).length;

  const place = (e: React.MouseEvent) => {
    const r = img.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setDraft({ x, y });
    setText("");
    setActive(null);
  };

  const save = () => {
    if (!draft || !text.trim()) return;
    s.addPin(card.id, attachment.id, draft.x, draft.y, text, staff && internal);
    setDraft(null);
    setText("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink text-canvas lg:flex-row" role="dialog" aria-modal aria-label={`Review ${attachment.name}`}>
      {/* image */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close">
            <Icon name="back" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{attachment.name}</p>
            <p className="truncate text-xs text-canvas/60">{card.title} · click anywhere on the image to leave feedback</p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
          {!src ? (
            <p className="text-sm text-canvas/60">Loading image…</p>
          ) : (
            <div ref={img} className="relative inline-block cursor-crosshair select-none" onClick={place}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={attachment.name} draggable={false} className="block max-h-[calc(100dvh-9rem)] max-w-full rounded-md shadow-2xl" />
              {pins.map((p) => (
                <button
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(p.id);
                    setDraft(null);
                  }}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  className={cn(
                    "absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-transform",
                    p.resolved ? "bg-ok/80" : p.internal ? "bg-ink" : "bg-brand",
                    active === p.id && "scale-125 ring-4 ring-white/40",
                  )}
                  aria-label={`Pin ${number.get(p.id)}`}
                >
                  {p.resolved ? <Icon name="check" size={13} /> : number.get(p.id)}
                </button>
              ))}
              {draft && (
                <div style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} className="absolute" onClick={(e) => e.stopPropagation()}>
                  <span className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-high text-xs font-bold shadow-lg">{all.length + 1}</span>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      save();
                    }}
                    className={cn("absolute top-5 w-72 rounded-xl bg-surface p-3 text-ink shadow-2xl", draft.x > 0.6 ? "right-0" : "-left-4", draft.y > 0.7 && "top-auto bottom-5")}
                  >
                    <textarea
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && save()}
                      rows={3}
                      placeholder="What should change here?"
                      className="w-full resize-none rounded-lg border border-line px-2.5 py-2 text-sm outline-none focus:border-brand"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      {staff && (
                        <label className="flex items-center gap-1.5 text-[11px] text-muted">
                          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[var(--color-brand)]" /> Team only
                        </label>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setDraft(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={!text.trim()}>
                        Pin it
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* pin list */}
      <aside className="flex max-h-[38dvh] w-full shrink-0 flex-col bg-surface text-ink lg:max-h-none lg:w-80">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">
            Feedback <span className="text-muted">· {open} open</span>
          </p>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-[var(--color-brand)]" /> Show resolved
          </label>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {pins.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">{all.length ? "Everything is resolved." : "No feedback yet. Click a spot on the image to add some."}</li>}
          {pins.map((p) => {
            const who = userById(p.userId);
            const canResolve = staff || p.userId === s.me.id;
            return (
              <li key={p.id} className={cn("flex gap-3 px-4 py-3", active === p.id && "bg-brand-soft/50")} onMouseEnter={() => setActive(p.id)}>
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white", p.resolved ? "bg-ok" : p.internal ? "bg-ink" : "bg-brand")}>{number.get(p.id)}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Avatar user={who} size={16} /> <span className="font-semibold text-ink-soft">{who?.name.split(" ")[0] ?? "Someone"}</span> · {timeAgo(p.at)}
                    {p.internal && (
                      <span className="rounded bg-sunken px-1 text-[10px] font-semibold">
                        <Icon name="lock" size={10} className="inline" /> team
                      </span>
                    )}
                  </p>
                  <p className={cn("mt-0.5 text-sm whitespace-pre-wrap", p.resolved && "text-muted line-through")}>{p.text}</p>
                  <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                    {canResolve && (
                      <button onClick={() => s.togglePin(p.id)} className="text-brand hover:underline">
                        {p.resolved ? "Reopen" : "Mark resolved"}
                      </button>
                    )}
                    {(p.userId === s.me.id || s.me.role === "admin") && (
                      <button onClick={() => confirm("Delete this pin?") && s.removePin(p.id)} className="text-muted hover:text-urgent">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>,
    document.body,
  );
}
