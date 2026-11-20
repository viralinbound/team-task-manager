"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Attachment, Card } from "@/lib/types";
import { Icon } from "./ui";

const isImage = (a: Attachment) => (a.type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(a.name);

/** Image preview: a signed link from private storage when live, the stored thumb in the demo. */
function Thumb({ a }: { a: Attachment }) {
  const s = useStore();
  const [src, setSrc] = useState(a.thumb ?? "");
  useEffect(() => {
    let on = true;
    if (!a.thumb && isImage(a)) s.fileUrl(a).then((u) => on && setSrc(u)).catch(() => {});
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.id]);
  if (!src)
    return (
      <span className="grid h-11 w-14 shrink-0 place-items-center rounded-md bg-sunken text-muted">
        <Icon name="clip" size={18} />
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-11 w-14 shrink-0 rounded-md object-cover" />;
}

export function Attachments({ card, canEdit }: { card: Card; canEdit: boolean }) {
  const s = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    await s.attachFiles(card.id, files);
    setBusy(false);
  };

  const open = async (a: Attachment) => {
    // Open the tab first (inside the click) so pop-up blockers allow it, then point it at the signed link.
    const w = window.open("", "_blank");
    try {
      const url = await s.fileUrl(a);
      if (w) w.location.href = url;
      else window.location.href = url;
    } catch {
      w?.close();
    }
  };

  if (!canEdit && card.attachments.length === 0) return null;

  return (
    <section
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDrag(false);
        add(Array.from(e.dataTransfer.files));
      }}
      className={drag ? "rounded-xl ring-2 ring-brand ring-offset-4" : undefined}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">Attachments {card.attachments.length > 0 && `(${card.attachments.length})`}</h3>
        {canEdit && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50">
            <Icon name={busy ? "clock" : "plus"} size={14} /> {busy ? "Uploading…" : "Add file"}
          </button>
        )}
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {card.attachments.length === 0 ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="w-full rounded-lg border border-dashed border-line-strong px-4 py-4 text-center text-xs text-muted hover:border-brand hover:text-brand"
        >
          Drop files here or click to upload (up to 25 MB each)
        </button>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {card.attachments.map((a) => (
            <li key={a.id} className="group flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:border-line-strong">
              <button type="button" onClick={() => open(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left" title={`Open ${a.name}`}>
                <Thumb a={a} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="text-xs text-faint">
                    {a.name.split(".").pop()?.toUpperCase()} · {a.size}
                  </span>
                </span>
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => confirm(`Remove ${a.name}?`) && s.removeAttachment(card.id, a.id)}
                  className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:bg-sunken hover:text-urgent focus:opacity-100"
                  aria-label={`Remove ${a.name}`}
                >
                  <Icon name="x" size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
