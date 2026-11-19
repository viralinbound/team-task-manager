"use client";

import Link from "next/link";
import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Client } from "@/lib/types";
import { cn, dueState } from "@/lib/format";
import { Button, Field, Icon, inputCls, Modal, PageHeader, Progress } from "@/components/ui";

const STATUS: Record<Client["status"], string> = { active: "bg-ok-soft text-ok", paused: "bg-high-soft text-high", completed: "bg-sunken text-muted" };

export default function ClientsPage() {
  const s = useStore();
  const { isDone, boardById } = useHelpers();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const list = s.clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Admin" title="Clients" sub="Every project belongs to a client. Invite their contacts to the portal from the client page.">
        <Button onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Add client
        </Button>
      </PageHeader>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" className={cn(inputCls, "mb-5 max-w-xs")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const boards = s.boards.filter((b) => b.clientId === c.id);
          const cc = s.cards.filter((k) => !k.archived && boardById(k.boardId)?.clientId === c.id);
          const d = cc.filter(isDone).length;
          const od = cc.filter((k) => !isDone(k) && dueState(k.due) === "overdue").length;
          const portal = s.users.filter((u) => u.clientId === c.id).length;
          return (
            <Link key={c.id} href={`/clients/${c.id}`} className="group rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_10px_30px_-14px_rgba(29,28,26,.35)]">
              <div className="flex items-start gap-3">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-lg font-semibold text-white" style={{ background: c.color }}>
                    {c.name[0]}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.industry}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS[c.status])}>{c.status}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat n={boards.length} l="Boards" />
                <Stat n={cc.length - d} l="Open" />
                <Stat n={od} l="Overdue" tone={od ? "text-urgent" : ""} />
              </div>
              <Progress value={cc.length ? d / cc.length : 0} className="mt-4" />
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{c.contact}</span>
                <span className={portal ? "font-semibold text-brand" : ""}>{portal ? `${portal} portal login` : "No portal login"}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <AddClient open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function Stat({ n, l, tone }: { n: number; l: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-canvas py-2">
      <p className={cn("font-display text-xl font-semibold", tone)}>{n}</p>
      <p className="text-[11px] text-muted">{l}</p>
    </div>
  );
}

function AddClient({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState({ name: "", industry: "", contact: "", email: "", phone: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} label="Add client" width="max-w-lg">
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          s.addClient({ ...f, status: "active", color: ["#6d5bd0", "#2b7a9a", "#8a5a3b", "#b4537a"][s.clients.length % 4] });
          setF({ name: "", industry: "", contact: "", email: "", phone: "" });
          onClose();
        }}
      >
        <h2 className="font-display text-2xl font-semibold">Add client</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Company name">
              <input autoFocus value={f.name} onChange={set("name")} className={inputCls} />
            </Field>
          </div>
          <Field label="Industry">
            <input value={f.industry} onChange={set("industry")} className={inputCls} />
          </Field>
          <Field label="Contact person">
            <input value={f.contact} onChange={set("contact")} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={f.email} onChange={set("email")} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={f.phone} onChange={set("phone")} className={inputCls} />
          </Field>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!f.name.trim()}>
            Add client
          </Button>
        </div>
      </form>
    </Modal>
  );
}
