"use client";

import Link from "next/link";
import { useHelpers, useStore } from "@/lib/store";
import type { Board } from "@/lib/types";
import { cn, dueState, greeting } from "@/lib/format";
import { Button, Icon, PageHeader } from "@/components/ui";
import { AddProjectTile, ProjectCard } from "@/components/ProjectCard";
import { useNewProject } from "@/components/NewProject";

export default function Home() {
  const s = useStore();
  const { visibleBoards, clientById, isDone } = useHelpers();
  const newProject = useNewProject();
  const canCreate = s.me.role !== "viewer";

  const mine = s.cards.filter((c) => !c.archived && c.assigneeIds.includes(s.me.id) && !isDone(c));
  const overdue = mine.filter((c) => dueState(c.due) === "overdue").length;
  const today = mine.filter((c) => dueState(c.due) === "today").length;
  const waiting = s.cards.filter((c) => !c.archived && c.teamId && !c.claimedBy && s.me.teamIds.includes(c.teamId)).length;

  const starred = visibleBoards.filter((b) => b.starred);
  const groups = new Map<string, Board[]>();
  visibleBoards.forEach((b) => {
    const k = b.clientId ?? "internal";
    groups.set(k, [...(groups.get(k) ?? []), b]);
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} title={`${greeting()}, ${s.me.name.split(" ")[0]}`}>
        <Link href="/projects">
          <Button variant="outline">
            <Icon name="folder" size={16} /> All projects
          </Button>
        </Link>
        {canCreate && (
          <Button onClick={() => newProject()}>
            <Icon name="plus" size={16} /> New project
          </Button>
        )}
      </PageHeader>

      {/* today strip */}
      <Link href="/my" className="group mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {[
          { n: mine.length, l: "Open tasks for you", tone: "text-ink" },
          { n: today, l: "Due today", tone: today ? "text-high" : "text-ink" },
          { n: overdue, l: "Overdue", tone: overdue ? "text-urgent" : "text-ink" },
          { n: waiting, l: "Team tasks to claim", tone: waiting ? "text-brand" : "text-ink" },
        ].map((x) => (
          <div key={x.l} className="bg-surface px-5 py-4 transition-colors group-hover:bg-canvas/40">
            <p className={cn("font-display text-3xl font-semibold", x.tone)}>{x.n}</p>
            <p className="mt-0.5 text-xs font-medium text-muted">{x.l}</p>
          </div>
        ))}
      </Link>

      {starred.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Icon name="star" size={16} className="text-high" fill /> Starred projects
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {starred.map((b) => (
              <ProjectCard key={b.id} board={b} />
            ))}
          </div>
        </section>
      )}

      {[...groups.entries()].map(([key, list]) => {
        const c = clientById(key);
        return (
          <section key={key} className="mb-10">
            <div className="mb-3 flex items-center gap-3">
              {c?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" className="h-7 w-7 rounded-md object-cover" />
              )}
              <h2 className="text-sm font-semibold text-ink-soft">{c ? c.name : "Internal"}</h2>
              {c && <span className="text-xs text-faint">{c.industry}</span>}
              <span className="ml-auto flex items-center gap-3">
                {canCreate && (
                  <button onClick={() => newProject({ clientId: c?.id })} className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-brand">
                    <Icon name="plus" size={14} /> Add project
                  </button>
                )}
                {c && s.me.role === "admin" && (
                  <Link href={`/clients/${c.id}`} className="text-xs font-semibold text-brand hover:underline">
                    Client page →
                  </Link>
                )}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => (
                <ProjectCard key={b.id} board={b} />
              ))}
            </div>
          </section>
        );
      })}

      {canCreate && (
        <section className="mb-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AddProjectTile onClick={() => newProject()} />
          </div>
        </section>
      )}
    </div>
  );
}
