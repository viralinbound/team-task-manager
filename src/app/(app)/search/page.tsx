"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { CardModal } from "@/components/CardModal";
import { CardTile } from "@/components/CardTile";
import { Avatar, Empty, Icon, inputCls, PageHeader } from "@/components/ui";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const s = useStore();
  const { visibleBoards, clientById } = useHelpers();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const term = q.trim().toLowerCase();
  const boardIds = new Set(visibleBoards.map((b) => b.id));
  const cards = term ? s.cards.filter((c) => boardIds.has(c.boardId) && !c.archived && (c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term))) : [];
  const boards = term ? visibleBoards.filter((b) => b.name.toLowerCase().includes(term) || clientById(b.clientId)?.name.toLowerCase().includes(term)) : [];
  const people = term ? s.users.filter((u) => u.role !== "client" && (u.name.toLowerCase().includes(term) || u.title.toLowerCase().includes(term))) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Search" />
      <div className="relative mb-8">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks, projects, clients, people…" className={`${inputCls} h-12 pl-11 text-base`} />
      </div>

      {!term && <Empty title="Type to search" sub="Try “logo”, “Apex” or “Priya”." />}
      {term && cards.length + boards.length + people.length === 0 && <Empty title={`Nothing found for “${q}”`} />}

      {boards.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">Projects</h2>
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <Link key={b.id} href={`/boards/${b.id}`} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium hover:border-line-strong">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: b.color }} />
                {b.name}
                <span className="text-xs font-normal text-muted">{clientById(b.clientId)?.name ?? "Internal"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">People</h2>
          <div className="flex flex-wrap gap-2">
            {people.map((u) => (
              <span key={u.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2">
                <Avatar user={u} size={26} />
                <span>
                  <span className="block text-sm font-medium">{u.name}</span>
                  <span className="block text-xs text-muted">{u.title}</span>
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {cards.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">Tasks ({cards.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <CardTile key={c.id} card={c} onOpen={() => setOpenId(c.id)} showBoard />
            ))}
          </div>
        </section>
      )}
      <CardModal cardId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
