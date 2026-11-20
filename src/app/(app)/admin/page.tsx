"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { cn, daysUntil, dueState, timeAgo } from "@/lib/format";
import { Avatar, Button, Chip, Icon, PageHeader, Panel, Progress } from "@/components/ui";
import { hm } from "@/components/TaskExtras";

export default function AdminDashboard() {
  const s = useStore();
  const { isDone, userById, boardById, clientById, teamById } = useHelpers();
  const [team, setTeam] = useState("");
  const [client, setClient] = useState("");

  const cards = useMemo(
    () => s.cards.filter((c) => !c.archived && (!client || boardById(c.boardId)?.clientId === client)),
    [s.cards, client, boardById],
  );
  const open = cards.filter((c) => !isDone(c));
  const overdue = open.filter((c) => dueState(c.due) === "overdue");
  const approval = open.filter((c) => s.lists.find((l) => l.id === c.listId)?.kind === "approval");
  const unclaimed = open.filter((c) => c.teamId && !c.claimedBy);
  const doneCount = cards.filter(isDone).length;
  const staff = s.users.filter((u) => u.role === "member" || u.role === "admin").filter((u) => !team || u.teamIds.includes(team));

  const load = staff
    .map((u) => {
      const mine = open.filter((c) => c.assigneeIds.includes(u.id));
      return { u, open: mine.length, overdue: mine.filter((c) => dueState(c.due) === "overdue").length, done: cards.filter((c) => isDone(c) && c.assigneeIds.includes(u.id)).length };
    })
    .sort((a, b) => b.open - a.open);
  const maxLoad = Math.max(4, ...load.map((l) => l.open));

  // time logged since Monday
  const monday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toLocaleDateString("en-CA");
  })();
  const week = s.timeEntries.filter((e) => e.spentOn >= monday && (!client || boardById(e.boardId)?.clientId === client));
  const sumBy = (key: (e: (typeof week)[number]) => string) => {
    const m = new Map<string, number>();
    week.forEach((e) => m.set(key(e), (m.get(key(e)) ?? 0) + e.minutes));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const timeByPerson = sumBy((e) => e.userId);
  const timeByProject = sumBy((e) => e.boardId);
  const weekTotal = week.reduce((n, e) => n + e.minutes, 0);

  const exportCsv = () => {
    const rows = [["Task", "Project", "Client", "Assignees", "Team", "Status", "Priority", "Due"]];
    cards.forEach((c) => {
      const b = boardById(c.boardId);
      rows.push([c.title, b?.name ?? "", clientById(b?.clientId)?.name ?? "Internal", c.assigneeIds.map((a) => userById(a)?.name).join("; "), teamById(c.teamId)?.name ?? "", s.lists.find((l) => l.id === c.listId)?.name ?? "", c.priority, c.due ?? ""]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "workboard-tasks.csv";
    a.click();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Admin" title="Team overview" sub="Who is working on what, what is late, and which client needs attention.">
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm">
          <option value="">All teams</option>
          {s.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={client} onChange={(e) => setClient(e.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm">
          <option value="">All clients</option>
          {s.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={exportCsv}>
          <Icon name="download" size={16} /> Export CSV
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { n: open.length, l: "Open tasks" },
          { n: overdue.length, l: "Overdue", tone: overdue.length ? "text-urgent" : "" },
          { n: approval.length, l: "Waiting on clients", tone: "text-brand" },
          { n: unclaimed.length, l: "Unclaimed team tasks", tone: unclaimed.length ? "text-high" : "" },
          { n: `${cards.length ? Math.round((doneCount / cards.length) * 100) : 0}%`, l: "Done overall", tone: "text-ok" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-line bg-surface px-5 py-4">
            <p className={cn("font-display text-[32px] leading-none font-semibold", k.tone)}>{k.n}</p>
            <p className="mt-2 text-xs font-medium text-muted">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          {/* Workload */}
          <Panel
            title="Workload this week"
            action={
              <span className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-brand" /> Open
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-urgent" /> Overdue
                </span>
              </span>
            }
          >
            <ul className="divide-y divide-line">
              {load.map(({ u, open: o, overdue: od, done }) => {
                const heavy = o >= 4;
                return (
                  <li key={u.id} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-4 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar user={u} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{u.name}</span>
                        <span className="block truncate text-[11px] text-muted">{u.teamIds.map((t) => teamById(t)?.name).join(", ") || u.title}</span>
                      </span>
                    </span>
                    <span className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
                      <span className="h-full bg-brand" style={{ width: `${((o - od) / maxLoad) * 100}%` }} />
                      <span className="h-full bg-urgent" style={{ width: `${(od / maxLoad) * 100}%` }} />
                    </span>
                    <span className="w-24 text-right text-xs">
                      <span className={cn("font-semibold", heavy ? "text-urgent" : "text-ink")}>{o} open</span>
                      <span className="block text-[11px] text-faint">{done} done</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {/* Client health */}
          <Panel title="Client health">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] tracking-wide text-faint uppercase">
                    <th className="px-5 py-2.5 font-semibold">Client</th>
                    <th className="px-3 py-2.5 font-semibold">Progress</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Overdue</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Awaiting approval</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.clients.map((c) => {
                    const cc = s.cards.filter((k) => !k.archived && boardById(k.boardId)?.clientId === c.id);
                    const d = cc.filter(isDone).length;
                    const od = cc.filter((k) => !isDone(k) && dueState(k.due) === "overdue").length;
                    const ap = cc.filter((k) => s.lists.find((l) => l.id === k.listId)?.kind === "approval").length;
                    const last = s.activity.find((a) => boardById(a.boardId)?.clientId === c.id);
                    return (
                      <tr key={c.id} className="hover:bg-canvas/50">
                        <td className="px-5 py-3">
                          <Link href={`/clients/${c.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {c.image ? <img src={c.image} alt="" className="h-7 w-7 rounded-md object-cover" /> : <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
                            {c.name}
                          </Link>
                          {c.status !== "active" && <span className="text-[11px] text-faint capitalize">{c.status}</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={cc.length ? d / cc.length : 0} className="w-24" />
                            <span className="text-xs text-muted">
                              {d}/{cc.length}
                            </span>
                          </div>
                        </td>
                        <td className={cn("px-3 py-3 text-right font-semibold", od ? "text-urgent" : "text-faint")}>{od}</td>
                        <td className={cn("px-3 py-3 text-right font-semibold", ap ? "text-brand" : "text-faint")}>{ap}</td>
                        <td className="px-5 py-3 text-right text-xs text-muted">{last ? timeAgo(last.at) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Needs attention */}
          <Panel title="Needs attention">
            <ul className="divide-y divide-line">
              {[...overdue.map((c) => ({ c, why: `${-daysUntil(c.due!)}d overdue`, tone: "text-urgent" })), ...unclaimed.map((c) => ({ c, why: `Unclaimed · ${teamById(c.teamId)?.name}`, tone: "text-high" }))].map(({ c, why, tone }) => (
                <li key={c.id + why}>
                  <Link href={`/boards/${c.boardId}?card=${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/50">
                    <span className={cn("w-32 shrink-0 text-xs font-semibold", tone)}>{why}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="block truncate text-xs text-muted">{boardById(c.boardId)?.name}</span>
                    </span>
                    <span className="flex -space-x-1.5">
                      {c.assigneeIds.map((a) => (
                        <Avatar key={a} user={userById(a)} size={22} ring />
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
              {overdue.length + unclaimed.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">All clear.</li>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Teams */}
          <Panel title="By team">
            <ul className="grid grid-cols-2 gap-px bg-line">
              {s.teams.map((t) => {
                const tc = open.filter((c) => c.teamId === t.id || c.assigneeIds.some((a) => userById(a)?.teamIds.includes(t.id)));
                return (
                  <li key={t.id} className="bg-surface px-5 py-4">
                    <Chip color={t.color}>{t.name}</Chip>
                    <p className="mt-2 font-display text-2xl font-semibold">{tc.length}</p>
                    <p className="text-xs text-muted">
                      open · <span className={tc.some((c) => dueState(c.due) === "overdue") ? "font-semibold text-urgent" : ""}>{tc.filter((c) => dueState(c.due) === "overdue").length} overdue</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {/* Projects */}
          <Panel title="Project progress">
            <ul className="divide-y divide-line">
              {s.boards.map((b) => {
                const bc = s.cards.filter((c) => c.boardId === b.id && !c.archived);
                const d = bc.filter(isDone).length;
                return (
                  <li key={b.id}>
                    <Link href={`/boards/${b.id}`} className="block px-5 py-3 hover:bg-canvas/50">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex min-w-0 items-center gap-2 font-medium">
                          <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: b.color }} />
                          <span className="truncate">{b.name}</span>
                        </span>
                        <span className="text-xs text-muted">{bc.length ? Math.round((d / bc.length) * 100) : 0}%</span>
                      </div>
                      <Progress value={bc.length ? d / bc.length : 0} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Time logged this week" action={<span className="text-xs font-semibold text-muted">{hm(weekTotal)} total</span>}>
            {week.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No time logged since Monday. People log time from the Time section inside any task.</p>
            ) : (
              <div className="grid gap-px bg-line sm:grid-cols-2">
                {(
                  [
                    ["By person", timeByPerson.map(([id, m]) => [userById(id)?.name ?? "Former member", m] as const)],
                    ["By project", timeByProject.map(([id, m]) => [boardById(id)?.name ?? "Removed project", m] as const)],
                  ] as const
                ).map(([title, rows]) => (
                  <div key={title} className="bg-surface px-5 py-3">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-faint uppercase">{title}</p>
                    <ul className="space-y-1.5">
                      {rows.slice(0, 6).map(([label, m]) => (
                        <li key={label} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          <span className="font-semibold">{hm(m)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Activity */}
          <Panel title="Live activity">
            <ul className="max-h-[440px] space-y-4 overflow-y-auto px-5 py-4">
              {s.activity.slice(0, 25).map((a) => {
                const u = userById(a.userId);
                return (
                  <li key={a.id} className="flex gap-3">
                    <Avatar user={u} size={26} />
                    <p className="text-sm leading-snug text-ink-soft">
                      <span className="font-semibold text-ink">{u?.name.split(" ")[0]}</span> {a.text}
                      <span className="block text-xs text-faint">
                        {timeAgo(a.at)}
                        {a.boardId && ` · ${boardById(a.boardId)?.name}`}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
