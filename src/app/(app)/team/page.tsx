"use client";

import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/format";
import { Avatar, Button, Chip, Field, Icon, inputCls, Modal, PageHeader, Panel } from "@/components/ui";

const ROLE_TONE: Record<Role, string> = { admin: "bg-ink text-canvas", member: "bg-sunken text-ink-soft", client: "bg-brand-soft text-brand-strong", viewer: "bg-sunken text-muted" };

export default function TeamPage() {
  const s = useStore();
  const { teamById, clientById, isDone } = useHelpers();
  const [inviting, setInviting] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [filter, setFilter] = useState<"all" | Role>("all");
  const people = s.users.filter((u) => filter === "all" || u.role === filter);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Admin" title="Team & people" sub="Invite people, set their role and put them in teams.">
        <Button onClick={() => setInviting(true)}>
          <Icon name="plus" size={16} /> Invite person
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] [&>*]:min-w-0">
        <Panel
          title={`People (${people.length})`}
          action={
            <div className="flex gap-1">
              {(["all", "admin", "member", "client"] as const).map((r) => (
                <button key={r} onClick={() => setFilter(r)} className={cn("rounded-md px-2 py-1 text-xs font-semibold capitalize", filter === r ? "bg-ink text-canvas" : "text-muted hover:bg-sunken")}>
                  {r}
                </button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-faint uppercase">
                  <th className="px-5 py-2.5 font-semibold">Person</th>
                  <th className="px-3 py-2.5 font-semibold">Role</th>
                  <th className="px-3 py-2.5 font-semibold">Teams / client</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Open tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {people.map((u) => {
                  const open = s.cards.filter((c) => !c.archived && c.assigneeIds.includes(u.id) && !isDone(c)).length;
                  return (
                    <tr key={u.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} size={32} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.name}</p>
                            <p className="truncate text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", ROLE_TONE[u.role])}>{u.role}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.clientId ? (
                            <Chip color={clientById(u.clientId)?.color}>{clientById(u.clientId)?.name}</Chip>
                          ) : u.teamIds.length ? (
                            u.teamIds.map((t) => (
                              <Chip key={t} color={teamById(t)?.color}>
                                {teamById(t)?.name}
                              </Chip>
                            ))
                          ) : (
                            <span className="text-xs text-faint">All teams</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">{u.role === "client" ? <span className="text-faint">–</span> : open}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={`Teams (${s.teams.length})`}>
          <ul className="divide-y divide-line">
            {s.teams.map((t) => {
              const members = s.users.filter((u) => u.teamIds.includes(t.id));
              return (
                <li key={t.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <Chip color={t.color}>{t.name}</Chip>
                    <span className="text-xs text-muted">{members.length} people</span>
                  </div>
                  <div className="mt-2.5 flex -space-x-1.5">
                    {members.map((m) => (
                      <Avatar key={m.id} user={m} size={24} ring />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <form
            className="flex gap-2 border-t border-line p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (teamName.trim()) s.addTeam(teamName.trim(), "#6d5bd0");
              setTeamName("");
            }}
          >
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="New team name" className={inputCls} />
            <Button variant="outline" type="submit">
              Add
            </Button>
          </form>
        </Panel>
      </div>

      <Invite open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function Invite({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [teams, setTeams] = useState<string[]>([]);
  return (
    <Modal open={open} onClose={onClose} label="Invite person" width="max-w-lg">
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name || !email) return;
          s.inviteUser({ name, email, title: title || "Team member", role, teamIds: teams, color: ["#6d5bd0", "#2b7a9a", "#b4537a", "#2f7d4f"][s.users.length % 4] });
          setName("");
          setEmail("");
          setTitle("");
          setTeams([]);
          onClose();
        }}
      >
        <h2 className="font-display text-2xl font-semibold">Invite a person</h2>
        <p className="mt-1 text-sm text-muted">{s.live ? "They sign in at the login page with this email and get this role straight away." : "They get an email link valid for 7 days."}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Work email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Job title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {!s.live && <option value="viewer">Viewer (read-only)</option>}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Teams">
              <div className="flex flex-wrap gap-1.5">
                {s.teams.map((t) => {
                  const on = teams.includes(t.id);
                  return (
                    <button type="button" key={t.id} onClick={() => setTeams((x) => (on ? x.filter((y) => y !== t.id) : [...x, t.id]))} className={cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-muted")}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name || !email}>
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
