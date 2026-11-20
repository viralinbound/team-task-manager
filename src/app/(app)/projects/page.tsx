"use client";

import Link from "next/link";
import { useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Board } from "@/lib/types";
import { cn, dueState, shortDate } from "@/lib/format";
import { AvatarStack, Button, Empty, Icon, inputCls, PageHeader, Progress } from "@/components/ui";
import { AddProjectTile, ProjectCard } from "@/components/ProjectCard";
import { useNewProject } from "@/components/NewProject";
import { ImportTrello } from "@/components/ImportTrello";

const STATUS: { key: "all" | NonNullable<Board["status"]>; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "on-hold", label: "On hold" },
  { key: "completed", label: "Completed" },
];

export default function ProjectsPage() {
  const s = useStore();
  const { visibleBoards, clientById, userById, isDone } = useHelpers();
  const newProject = useNewProject();
  const [q, setQ] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState<(typeof STATUS)[number]["key"]>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [importing, setImporting] = useState(false);
  const canCreate = s.me.role !== "viewer";

  const list = visibleBoards.filter(
    (b) =>
      (!q || b.name.toLowerCase().includes(q.toLowerCase()) || clientById(b.clientId)?.name.toLowerCase().includes(q.toLowerCase())) &&
      (!client || (client === "internal" ? !b.clientId : b.clientId === client)) &&
      (status === "all" || (b.status ?? "active") === status),
  );
  const count = (k: string) => (k === "all" ? visibleBoards.length : visibleBoards.filter((b) => (b.status ?? "active") === k).length);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Projects" sub={`${visibleBoards.length} projects · ${new Set(visibleBoards.filter((b) => b.clientId).map((b) => b.clientId)).size} clients · ${visibleBoards.filter((b) => !b.clientId).length} internal`}>
        {canCreate && (
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Icon name="download" size={16} /> Import from Trello
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => newProject()}>
            <Icon name="plus" size={16} /> New project
          </Button>
        )}
      </PageHeader>
      {importing && <ImportTrello onClose={() => setImporting(false)} />}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects or clients" className={cn(inputCls, "pl-9")} />
        </div>
        <select value={client} onChange={(e) => setClient(e.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm">
          <option value="">All clients</option>
          {s.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="internal">Internal</option>
        </select>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {STATUS.map((st) => (
            <button key={st.key} onClick={() => setStatus(st.key)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", status === st.key ? "bg-ink text-canvas" : "text-ink-soft hover:bg-sunken")}>
              {st.label} <span className="opacity-60">{count(st.key)}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto inline-flex rounded-xl border border-line bg-surface p-1">
          {(["grid", "list"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("grid h-8 w-9 place-items-center rounded-lg", view === v ? "bg-sunken text-ink" : "text-muted hover:text-ink")} aria-label={`${v} view`}>
              <Icon name={v === "grid" ? "grid" : "rows"} size={16} />
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && !canCreate && <Empty title="No projects match" />}

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((b) => (
            <ProjectCard key={b.id} board={b} />
          ))}
          {canCreate && <AddProjectTile onClick={() => newProject({ clientId: client && client !== "internal" ? client : undefined })} />}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-faint uppercase">
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-3 py-3 font-semibold">Progress</th>
                  <th className="px-3 py-3 text-right font-semibold">Open</th>
                  <th className="px-3 py-3 text-right font-semibold">Overdue</th>
                  <th className="px-3 py-3 font-semibold">Deadline</th>
                  <th className="px-3 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((b) => {
                  const cards = s.cards.filter((c) => c.boardId === b.id && !c.archived);
                  const d = cards.filter(isDone).length;
                  const od = cards.filter((c) => !isDone(c) && dueState(c.due) === "overdue").length;
                  const c = clientById(b.clientId);
                  return (
                    <tr key={b.id} className="hover:bg-canvas/50">
                      <td className="px-5 py-3">
                        <Link href={`/boards/${b.id}`} className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {b.cover && <img src={b.cover} alt="" className="h-10 w-14 rounded-lg object-cover" />}
                          <span className="min-w-0">
                            <span className="block truncate font-semibold hover:underline">{b.name}</span>
                            <span className="block truncate text-xs text-muted">{c?.name ?? "Internal"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={cards.length ? d / cards.length : 0} className="w-24" />
                          <span className="text-xs text-muted">{cards.length ? Math.round((d / cards.length) * 100) : 0}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{cards.length - d}</td>
                      <td className={cn("px-3 py-3 text-right font-semibold", od ? "text-urgent" : "text-faint")}>{od}</td>
                      <td className={cn("px-3 py-3 text-xs", b.dueDate && dueState(b.dueDate) === "overdue" ? "font-semibold text-urgent" : "text-ink-soft")}>{b.dueDate ? shortDate(b.dueDate) : "–"}</td>
                      <td className="px-3 py-3">
                        <AvatarStack users={b.memberIds.map(userById)} size={24} max={4} />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={b.status ?? "active"}
                          disabled={s.me.role !== "admin"}
                          onChange={(e) => s.updateBoard(b.id, { status: e.target.value as Board["status"] })}
                          className={cn(
                            "rounded-full border-0 px-2.5 py-1 text-xs font-semibold",
                            (b.status ?? "active") === "active" ? "bg-ok-soft text-ok" : b.status === "on-hold" ? "bg-high-soft text-high" : "bg-sunken text-muted",
                          )}
                        >
                          <option value="active">Active</option>
                          <option value="on-hold">On hold</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canCreate && (
            <button onClick={() => newProject()} className="flex w-full items-center gap-2 border-t border-line px-5 py-3.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-brand">
              <Icon name="plus" size={16} /> Add project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
