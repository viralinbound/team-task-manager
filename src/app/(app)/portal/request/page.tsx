"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Priority } from "@/lib/types";
import { cn, PRIORITY } from "@/lib/format";
import { Button, Field, Icon, inputCls, PageHeader } from "@/components/ui";

export default function NewRequest() {
  const s = useStore();
  const boards = s.boards.filter((b) => b.clientId === s.me.clientId);
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [wantedBy, setWantedBy] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-soft text-ok">
          <Icon name="check" size={26} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold">Request sent</h1>
        <p className="mt-2 text-sm text-muted">The team has been notified. You&apos;ll get an update when it&apos;s accepted, started and finished.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/portal">
            <Button>Back to my projects</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setTitle("");
              setDescription("");
              setFiles([]);
            }}
          >
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Client portal" title="New request" sub="Tell the team what you need. They'll review it and assign it." />
      <form
        className="space-y-5 rounded-2xl border border-line bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !boardId) return;
          s.addRequest({ clientId: s.me.clientId!, boardId, title: title.trim(), description, priority, wantedBy: wantedBy || undefined });
          setSent(true);
        }}
      >
        <Field label="Project">
          <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className={inputCls}>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What do you need?">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Add our new showroom address to the website" className={inputCls} />
        </Field>
        <Field label="Details" hint="Links, examples, anything that helps.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={inputCls} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="How urgent?">
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                <button type="button" key={p} onClick={() => setPriority(p)} className={cn("rounded-lg border py-2 text-xs font-semibold", priority === p ? `${PRIORITY[p].bg} ${PRIORITY[p].text} border-transparent` : "border-line text-muted")}>
                  {PRIORITY[p].label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Wanted by (optional)">
            <input type="date" value={wantedBy} onChange={(e) => setWantedBy(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Files (optional)">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-4 py-6 text-center hover:border-brand">
            <Icon name="clip" className="text-faint" />
            <span className="mt-2 text-sm font-medium">Click to attach files</span>
            <span className="text-xs text-faint">Images, PDFs, documents</span>
            <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))} />
          </label>
          {files.length > 0 && <p className="mt-2 text-xs text-muted">{files.join(", ")}</p>}
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/portal">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={!title.trim()}>
            Send request
          </Button>
        </div>
      </form>
    </div>
  );
}
