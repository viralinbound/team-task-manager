"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { cn, dueState, shortDate, timeAgo } from "@/lib/format";
import { Avatar, Button, Empty, Field, Icon, inputCls, Panel, PriorityPill, Progress } from "@/components/ui";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const { clientById, isDone, boardById, userById } = useHelpers();
  const c = clientById(id);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [nm, setNm] = useState("");

  if (!c) return <Empty title="Client not found" />;
  const boards = s.boards.filter((b) => b.clientId === c.id);
  const cards = s.cards.filter((k) => !k.archived && boardById(k.boardId)?.clientId === c.id);
  const approvals = cards.filter((k) => s.lists.find((l) => l.id === k.listId)?.kind === "approval");
  const requests = s.requests.filter((r) => r.clientId === c.id);
  const contacts = s.users.filter((u) => u.clientId === c.id);
  const activity = s.activity.filter((a) => boardById(a.boardId)?.clientId === c.id).slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
        <Icon name="back" size={14} /> All clients
      </Link>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl font-semibold text-white" style={{ background: c.color }}>
            {c.name[0]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold">{c.name}</h1>
          <p className="text-sm text-muted">
            {c.industry} · <span className="capitalize">{c.status}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => setInviting(true)}>
          <Icon name="plus" size={16} /> Invite to portal
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title={`Projects (${boards.length})`}>
            <ul className="divide-y divide-line">
              {boards.map((b) => {
                const bc = cards.filter((k) => k.boardId === b.id);
                const d = bc.filter(isDone).length;
                const od = bc.filter((k) => !isDone(k) && dueState(k.due) === "overdue").length;
                return (
                  <li key={b.id}>
                    <Link href={`/boards/${b.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {b.cover ? <img src={b.cover} alt="" className="h-10 w-14 rounded-lg object-cover" /> : <span className="h-8 w-1.5 rounded-full" style={{ background: b.color }} />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{b.name}</span>
                        <span className="text-xs text-muted">
                          {d}/{bc.length} done{od > 0 && <span className="font-semibold text-urgent"> · {od} overdue</span>}
                        </span>
                      </span>
                      <Progress value={bc.length ? d / bc.length : 0} className="w-28" />
                    </Link>
                  </li>
                );
              })}
              {boards.length === 0 && <li className="px-5 py-6 text-sm text-muted">No boards yet. Create one from Home and pick this client.</li>}
            </ul>
          </Panel>

          <Panel title={`Waiting for client approval (${approvals.length})`}>
            <ul className="divide-y divide-line">
              {approvals.map((k) => (
                <li key={k.id}>
                  <Link href={`/boards/${k.boardId}?card=${k.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/50">
                    <span className="flex-1 text-sm font-medium">{k.title}</span>
                    <span className="text-xs text-muted">sent {timeAgo(k.history[0]?.at ?? k.createdAt)}</span>
                  </Link>
                </li>
              ))}
              {approvals.length === 0 && <li className="px-5 py-6 text-sm text-muted">Nothing waiting on the client.</li>}
            </ul>
          </Panel>

          <Panel title={`Requests (${requests.length})`}>
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{r.title}</span>
                    <span className="text-xs text-muted">
                      {userById(r.by)?.name} · {timeAgo(r.at)}
                      {r.wantedBy && ` · wanted by ${shortDate(r.wantedBy)}`}
                    </span>
                  </span>
                  <PriorityPill p={r.priority} compact />
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", r.status === "new" ? "bg-high-soft text-high" : r.status === "accepted" ? "bg-ok-soft text-ok" : "bg-sunken text-muted")}>{r.status}</span>
                </li>
              ))}
              {requests.length === 0 && <li className="px-5 py-6 text-sm text-muted">No requests from this client yet.</li>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Contact">
            <dl className="space-y-3 px-5 py-4 text-sm">
              {[
                ["Contact person", c.contact],
                ["Email", c.email],
                ["Phone", c.phone],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-right font-medium">{v || "–"}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Portal logins">
            <ul className="space-y-3 px-5 py-4">
              {contacts.map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <Avatar user={u} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.name}</span>
                    <span className="block truncate text-xs text-muted">{u.email}</span>
                  </span>
                  <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok">Active</span>
                </li>
              ))}
              {contacts.length === 0 && <li className="text-sm text-muted">Nobody from {c.name} can log in yet.</li>}
            </ul>
            {inviting && (
              <form
                className="space-y-3 border-t border-line px-5 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email || !nm) return;
                  s.inviteUser({ name: nm, email, role: "client", title: `Contact, ${c.name}`, teamIds: [], clientId: c.id, color: c.color });
                  setEmail("");
                  setNm("");
                  setInviting(false);
                }}
              >
                <Field label="Name">
                  <input value={nm} onChange={(e) => setNm(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Email" hint="They get an email link to set a password. They will only see this client's projects.">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </Field>
                <div className="flex gap-2">
                  <Button size="sm" type="submit">
                    Send invite
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setInviting(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Recent activity">
            <ul className="space-y-3.5 px-5 py-4">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <Avatar user={userById(a.userId)} size={24} />
                  <p className="leading-snug text-ink-soft">
                    <span className="font-semibold text-ink">{userById(a.userId)?.name.split(" ")[0]}</span> {a.text}
                    <span className="block text-xs text-faint">{timeAgo(a.at)}</span>
                  </p>
                </li>
              ))}
              {activity.length === 0 && <li className="text-sm text-muted">No activity yet.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
