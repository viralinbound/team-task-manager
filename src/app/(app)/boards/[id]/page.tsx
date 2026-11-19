"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import type { Card } from "@/lib/types";
import { cn, dueState } from "@/lib/format";
import { Kanban } from "@/components/Kanban";
import { CardModal } from "@/components/CardModal";
import { Avatar, AvatarStack, Empty, Icon } from "@/components/ui";

export default function BoardPage() {
  return (
    <Suspense>
      <BoardInner />
    </Suspense>
  );
}

function BoardInner() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const { boardById, clientById, userById, visibleBoards, isDone } = useHelpers();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const openId = params.get("card");
  const [who, setWho] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [due, setDue] = useState<"" | "overdue" | "week">("");
  const [showArchive, setShowArchive] = useState(false);

  const board = boardById(id);
  if (!board || !visibleBoards.some((b) => b.id === id)) {
    return <Empty title="Project not found" sub="It may have been removed, or you don't have access."><Link href="/" className="text-sm font-semibold text-brand">Back home</Link></Empty>;
  }
  const client = clientById(board.clientId);
  const open = (cid: string | null) => router.replace(cid ? `${path}?card=${cid}` : path, { scroll: false });
  const filtering = !!(who || label || due);
  const dim = (c: Card) => {
    if (who === "me" && !c.assigneeIds.includes(s.me.id)) return true;
    if (who && who !== "me" && !c.assigneeIds.includes(who)) return true;
    if (label && !c.labels.includes(label)) return true;
    if (due === "overdue" && dueState(c.due, isDone(c)) !== "overdue") return true;
    if (due === "week" && !(c.due && ["overdue", "today", "soon"].includes(dueState(c.due, isDone(c))))) return true;
    return false;
  };
  const archived = s.cards.filter((c) => c.boardId === id && c.archived);
  const requests = s.requests.filter((r) => r.boardId === id && r.status === "new");

  return (
    <div className="-mt-2">
      {/* board header */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        {board.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={board.cover} alt="" className="h-12 w-16 rounded-lg object-cover" />
        ) : (
          <span className="h-9 w-1.5 rounded-full" style={{ background: board.color }} />
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            {client?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.image} alt="" className="h-4 w-4 rounded object-cover" />
            )}
            {client ? client.name : "Internal project"}
          </p>
          <h1 className="font-display text-2xl leading-tight font-semibold">{board.name}</h1>
          {(board.description || board.dueDate) && (
            <p className="mt-0.5 max-w-xl truncate text-xs text-muted">
              {board.dueDate && <span className="font-semibold text-ink-soft">Deadline {new Date(board.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
              {board.dueDate && board.description && " · "}
              {board.description}
            </p>
          )}
        </div>
        <button onClick={() => s.toggleStar(board.id)} className={cn("rounded-md p-1.5", board.starred ? "text-high" : "text-faint hover:text-high")} aria-label="Star project">
          <Icon name="star" size={18} fill={board.starred} />
        </button>
        <div className="ml-auto flex items-center gap-3">
          <AvatarStack users={board.memberIds.map(userById)} size={28} max={5} />
          {client && (
            <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong sm:inline-flex">
              <Icon name="eye" size={14} /> Shared with client
            </span>
          )}
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBtn on={who === "me"} onClick={() => setWho(who === "me" ? "" : "me")}>
          <Avatar user={s.me} size={18} /> My cards
        </FilterBtn>
        <select value={who && who !== "me" ? who : ""} onChange={(e) => setWho(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink-soft">
          <option value="">Anyone</option>
          {board.memberIds.map((m) => (
            <option key={m} value={m}>
              {userById(m)?.name}
            </option>
          ))}
        </select>
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink-soft">
          <option value="">All labels</option>
          {s.labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <FilterBtn on={due === "overdue"} onClick={() => setDue(due === "overdue" ? "" : "overdue")}>
          Overdue
        </FilterBtn>
        <FilterBtn on={due === "week"} onClick={() => setDue(due === "week" ? "" : "week")}>
          Due soon
        </FilterBtn>
        {filtering && (
          <button onClick={() => (setWho(""), setLabel(""), setDue(""))} className="text-xs font-semibold text-brand hover:underline">
            Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {requests.length > 0 && (
            <span className="rounded-full bg-high-soft px-2.5 py-1 text-xs font-semibold text-high">
              {requests.length} new client request{requests.length > 1 ? "s" : ""}
            </span>
          )}
          <FilterBtn on={showArchive} onClick={() => setShowArchive((v) => !v)}>
            <Icon name="archive" size={14} /> Archive ({archived.length})
          </FilterBtn>
        </div>
      </div>

      {showArchive && (
        <div className="mb-4 rounded-2xl border border-line bg-surface p-4">
          <p className="mb-2 text-sm font-semibold">Archived cards</p>
          {archived.length === 0 ? (
            <p className="text-sm text-muted">Nothing archived. Archived cards can always be restored.</p>
          ) : (
            <ul className="divide-y divide-line">
              {archived.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1">{c.title}</span>
                  <button onClick={() => s.archiveCard(c.id, false)} className="text-xs font-semibold text-brand hover:underline">
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Kanban boardId={board.id} onOpen={open} dim={filtering ? dim : undefined} />
      <CardModal cardId={openId} onClose={() => open(null)} />
    </div>
  );
}

function FilterBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold", on ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface text-ink-soft hover:border-line-strong")}>
      {children}
    </button>
  );
}
