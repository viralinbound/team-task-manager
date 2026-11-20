"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import { useStore } from "@/lib/store";
import { COVER_CHOICES, TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/format";
import { Avatar, Button, Field, Icon, inputCls, Modal } from "./ui";

type Opener = (opts?: { clientId?: string }) => void;
const Ctx = createContext<Opener>(() => {});

/** Lets any screen open the New Project form: const open = useNewProject(); open({ clientId }). */
export const useNewProject = () => useContext(Ctx);

export function NewProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; clientId?: string; key: number }>({ open: false, key: 0 });
  const open = useCallback<Opener>((opts) => setState((s) => ({ open: true, clientId: opts?.clientId, key: s.key + 1 })), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {state.open && <NewProjectForm key={state.key} initialClient={state.clientId} onClose={() => setState((s) => ({ ...s, open: false }))} />}
    </Ctx.Provider>
  );
}

function NewProjectForm({ initialClient, onClose }: { initialClient?: string; onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState(initialClient ?? "");
  const [template, setTemplate] = useState(initialClient ? "client" : "blank");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [cover, setCover] = useState(COVER_CHOICES[0]);
  const [members, setMembers] = useState<string[]>([s.me.id]);
  const staff = s.users.filter((u) => u.role === "admin" || u.role === "member");
  const all = [...TEMPLATES, ...s.templates];
  const tpl = all.find((t) => t.id === template) ?? TEMPLATES[0];
  const tasksIn = (t: (typeof all)[number]) => t.starter.length + (t.cards?.length ?? 0);

  const submit = () => {
    if (!name.trim()) return;
    const id = s.addBoard(
      {
        name: name.trim(),
        clientId: clientId || undefined,
        color: "#1f6f5c",
        cover,
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        memberIds: Array.from(new Set([...members, s.me.id])),
      },
      template,
    );
    onClose();
    router.push(`/boards/${id}`);
  };

  return (
    <Modal open onClose={onClose} label="New project" width="max-w-3xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-start justify-between border-b border-line px-6 pt-6 pb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">New project</h2>
            <p className="mt-1 text-sm text-muted">Pick a starting point, name it, and choose who works on it.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-sunken" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="max-h-[68vh] space-y-6 overflow-y-auto px-6 py-6">
          {/* template */}
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-soft">Start from</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {all.map((t) => (
                <div key={t.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={cn("h-full w-full rounded-xl border p-3 text-left transition-colors", template === t.id ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-line hover:border-line-strong")}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{t.name}</span>
                      {template === t.id ? <Icon name="check" size={16} className="shrink-0 text-brand" /> : t.saved && <span className="shrink-0 rounded bg-sunken px-1.5 py-px text-[10px] font-semibold text-muted">Saved</span>}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted">{t.blurb}</span>
                  </button>
                  {t.saved && (s.me.role === "admin" || t.createdBy === s.me.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Delete the template “${t.name}”? Projects already made from it stay as they are.`)) return;
                        if (template === t.id) setTemplate("blank");
                        s.deleteTemplate(t.id);
                      }}
                      className="absolute right-1.5 bottom-1.5 rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:bg-sunken hover:text-urgent focus:opacity-100"
                      aria-label={`Delete template ${t.name}`}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              <span className="font-semibold text-ink-soft">Lists:</span>
              {tpl.lists.map((l, i) => (
                <span key={i} className={cn("rounded-md px-2 py-0.5 font-medium", l.kind === "approval" ? "bg-brand-soft text-brand-strong" : l.kind === "requests" ? "bg-high-soft text-high" : "bg-sunken text-ink-soft")}>
                  {l.name}
                </span>
              ))}
              {tasksIn(tpl) > 0 && <span className="ml-1">+ {tasksIn(tpl)} starter tasks</span>}
              {(tpl.fields?.length ?? 0) > 0 && <span className="ml-1">· {tpl.fields!.length} custom fields</span>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Project name">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" className={inputCls} />
              </Field>
            </div>
            <Field label="Client">
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  if (e.target.value && template === "blank") setTemplate("client");
                }}
                className={inputCls}
              >
                <option value="">Internal (no client)</option>
                {s.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Deadline">
                <input type="date" value={dueDate} min={startDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description (optional)">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this project about? What does done look like?" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* cover */}
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-soft">Cover photo</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {COVER_CHOICES.map((c) => (
                <button type="button" key={c} onClick={() => setCover(c)} className={cn("relative overflow-hidden rounded-lg ring-offset-2 ring-offset-surface", cover === c && "ring-2 ring-brand")} aria-label="Choose cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c} alt="" className="aspect-[4/3] w-full object-cover" />
                  {cover === c && (
                    <span className="absolute inset-0 grid place-items-center bg-ink/30 text-white">
                      <Icon name="check" size={18} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* members */}
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-soft">
              Team members <span className="font-normal text-faint">· {members.length} selected</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {staff.map((u) => {
                const on = members.includes(u.id);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setMembers((m) => (on ? m.filter((x) => x !== u.id) : [...m, u.id]))}
                    className={cn("flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium", on ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-ink-soft hover:border-line-strong")}
                  >
                    <Avatar user={u} size={24} />
                    {u.name}
                    {on && <Icon name="check" size={13} />}
                  </button>
                );
              })}
            </div>
            {clientId && <p className="mt-2 text-xs text-muted">Client contacts see this project in their portal automatically. Only cards marked client-visible are shown.</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
