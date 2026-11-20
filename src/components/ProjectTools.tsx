"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Board, FieldDef, FieldType } from "@/lib/types";
import { Button, Field, Icon, inputCls, Modal } from "./ui";

const TYPES: [FieldType, string][] = [
  ["text", "Text"],
  ["number", "Number"],
  ["date", "Date"],
  ["select", "Choice list"],
  ["checkbox", "Yes / no"],
];
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `f-${Math.random().toString(36).slice(2)}`);

/** "⋯" menu on a project: custom fields and save-as-template. Staff only. */
export function ProjectTools({ board }: { board: Board }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"fields" | "template" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink-soft hover:border-line-strong" aria-haspopup="menu" aria-expanded={open}>
        <Icon name="settings" size={14} /> Project tools
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1.5 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          <MenuItem icon="rows" label="Custom fields" sub={`${board.fields?.length ?? 0} on this project`} onClick={() => (setModal("fields"), setOpen(false))} />
          <MenuItem icon="folder" label="Save as template" sub="Reuse these columns and tasks" onClick={() => (setModal("template"), setOpen(false))} />
        </div>
      )}
      {modal === "fields" && <FieldsModal board={board} onClose={() => setModal(null)} />}
      {modal === "template" && <TemplateModal board={board} onClose={() => setModal(null)} />}
    </div>
  );
}

function MenuItem({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-sunken">
      <Icon name={icon} size={16} className="mt-0.5 text-brand" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[11px] text-muted">{sub}</span>
      </span>
    </button>
  );
}

function FieldsModal({ board, onClose }: { board: Board; onClose: () => void }) {
  const s = useStore();
  const [fields, setFields] = useState<FieldDef[]>(board.fields ?? []);
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [options, setOptions] = useState("");
  const update = (id: string, patch: Partial<FieldDef>) => setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <Modal open onClose={onClose} label="Custom fields" width="max-w-xl">
      <div className="border-b border-line px-6 pt-6 pb-4">
        <h2 className="font-display text-2xl font-semibold">Custom fields</h2>
        <p className="mt-1 text-sm text-muted">Extra details every task in “{board.name}” can have, such as budget, platform or go-live date. They show on each task and as columns in Table view.</p>
      </div>
      <div className="space-y-4 px-6 py-5">
        {fields.length === 0 && <p className="text-sm text-muted">No custom fields yet.</p>}
        <ul className="space-y-2">
          {fields.map((f, i) => (
            <li key={f.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <input value={f.name} onChange={(e) => update(f.id, { name: e.target.value })} className={inputCls} aria-label="Field name" />
                <span className="shrink-0 rounded-md bg-sunken px-2 py-1 text-[11px] font-semibold text-muted">{TYPES.find(([t]) => t === f.type)?.[1]}</span>
                <button onClick={() => i > 0 && setFields((x) => { const c = [...x]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })} disabled={i === 0} className="rounded p-1 text-faint hover:text-ink disabled:opacity-30" aria-label="Move up">
                  ↑
                </button>
                <button onClick={() => confirm(`Remove “${f.name}”? Values already filled in on tasks are hidden.`) && setFields((x) => x.filter((y) => y.id !== f.id))} className="rounded p-1 text-faint hover:text-urgent" aria-label={`Remove ${f.name}`}>
                  <Icon name="x" size={15} />
                </button>
              </div>
              {f.type === "select" && (
                <input
                  value={(f.options ?? []).join(", ")}
                  onChange={(e) => update(f.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  placeholder="Choices, separated by commas"
                  className={`${inputCls} mt-2 text-xs`}
                  aria-label="Choices"
                />
              )}
            </li>
          ))}
        </ul>

        <form
          className="rounded-xl border border-dashed border-line-strong p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const opts = options.split(",").map((o) => o.trim()).filter(Boolean);
            setFields((f) => [...f, { id: newId(), name: name.trim(), type, ...(type === "select" ? { options: opts } : {}) }]);
            setName("");
            setOptions("");
          }}
        >
          <p className="mb-2 text-xs font-semibold text-ink-soft">Add a field</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Budget (₹)" className={inputCls} aria-label="New field name" />
            <select value={type} onChange={(e) => setType(e.target.value as FieldType)} className={inputCls} aria-label="New field type">
              {TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Add
            </Button>
          </div>
          {type === "select" && <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Choices, separated by commas: Instagram, Facebook, LinkedIn" className={`${inputCls} mt-2 text-xs`} />}
        </form>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            s.setFields(board.id, fields.filter((f) => f.name.trim()));
            onClose();
          }}
        >
          Save fields
        </Button>
      </div>
    </Modal>
  );
}

function TemplateModal({ board, onClose }: { board: Board; onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState(board.name);
  const [blurb, setBlurb] = useState("");
  const [saved, setSaved] = useState(false);
  const lists = s.lists.filter((l) => l.boardId === board.id);
  const tasks = s.cards.filter((c) => c.boardId === board.id && !c.archived && lists.find((l) => l.id === c.listId)?.kind !== "done").length;

  return (
    <Modal open onClose={onClose} label="Save as template" width="max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          s.saveTemplate(board.id, name.trim(), blurb.trim());
          setSaved(true);
        }}
      >
        <div className="border-b border-line px-6 pt-6 pb-4">
          <h2 className="font-display text-2xl font-semibold">Save as template</h2>
          <p className="mt-1 text-sm text-muted">
            Copies the {lists.length} columns, {tasks} open task{tasks === 1 ? "" : "s"} (with subtasks, labels and priority) and {board.fields?.length ?? 0} custom field{(board.fields?.length ?? 0) === 1 ? "" : "s"}. People, dates, comments and files are not copied.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {saved ? (
            <p className="rounded-xl bg-ok-soft p-4 text-sm text-ok">Saved. It now appears under “Start from” when anyone on the team creates a new project.</p>
          ) : (
            <>
              <Field label="Template name">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Short description (optional)">
                <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="e.g. Our standard 6-week website build" className={inputCls} />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {saved ? "Close" : "Cancel"}
          </Button>
          {!saved && <Button type="submit">Save template</Button>}
        </div>
      </form>
    </Modal>
  );
}
