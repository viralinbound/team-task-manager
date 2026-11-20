"use client";

import { useEffect, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { Attachments } from "./Attachments";
import type { Priority } from "@/lib/types";
import { cn, PRIORITY, timeAgo } from "@/lib/format";
import { Avatar, Button, DueChip, Icon, inputCls, Modal, PriorityPill, Progress } from "./ui";

export function CardModal({ cardId, onClose, client }: { cardId: string | null; onClose: () => void; client?: boolean }) {
  const s = useStore();
  const { userById, teamById, listById, labelById, boardById, isDone } = useHelpers();
  const card = s.cards.find((c) => c.id === cardId);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [changeText, setChangeText] = useState("");
  const [askChanges, setAskChanges] = useState(false);
  const [tab, setTab] = useState<"comments" | "history">("comments");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDesc(card.description);
      setAskChanges(false);
      setChangeText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  if (!card) return <Modal open={false} onClose={onClose} label="Card">{null}</Modal>;

  const board = boardById(card.boardId);
  const list = listById(card.listId);
  const lists = s.lists.filter((l) => l.boardId === card.boardId);
  const members = s.users.filter((u) => board?.memberIds.includes(u.id));
  const team = teamById(card.teamId);
  const done = isDone(card);
  const canEdit = !client && s.me.role !== "viewer";
  const isTeamMember = team && s.me.teamIds.includes(team.id);
  const checked = card.checklist.filter((c) => c.done).length;
  const comments = client ? card.comments.filter((c) => !c.internal) : card.comments;

  return (
    <Modal open onClose={onClose} label={card.title} width="max-w-4xl">
      {card.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.cover} alt="" className="block h-44 w-full rounded-t-2xl object-cover sm:h-56" />
      )}
      {/* header */}
      <div className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4 sm:px-7">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-[3px]" style={{ background: board?.color }} />
            {board?.name}
            <Icon name="arrow" size={12} className="text-faint" />
            <span className="font-semibold text-ink-soft">{list?.name}</span>
            {!card.clientVisible && !client && (
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-sunken px-1.5 py-0.5 font-medium text-ink-soft">
                <Icon name="lock" size={12} /> Internal only
              </span>
            )}
          </p>
          {canEdit ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== card.title && s.updateCard(card.id, { title: title.trim() }, "renamed this card")}
              className="w-full rounded-md bg-transparent font-display text-2xl leading-tight font-semibold text-ink outline-none focus:bg-canvas"
            />
          ) : (
            <h2 className="font-display text-2xl leading-tight font-semibold">{card.title}</h2>
          )}
        </div>
        <button onClick={onClose} className="focus-ring rounded-lg p-2 text-muted hover:bg-sunken" aria-label="Close">
          <Icon name="x" />
        </button>
      </div>

      {/* client approval banner */}
      {client && list?.kind === "approval" && (
        <div className="mx-5 mt-5 rounded-xl border border-brand/30 bg-brand-soft p-4 sm:mx-7">
          <p className="text-sm font-semibold text-brand-strong">This is ready for your approval</p>
          <p className="mt-0.5 text-sm text-ink-soft">Approve it, or tell the team what to change.</p>
          {!askChanges ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  s.approve(card.id);
                  onClose();
                }}
              >
                <Icon name="check" size={16} /> Approve
              </Button>
              <Button variant="outline" onClick={() => setAskChanges(true)}>
                Request changes
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea autoFocus value={changeText} onChange={(e) => setChangeText(e.target.value)} rows={3} placeholder="What should the team change?" className={inputCls} />
              <div className="flex gap-2">
                <Button
                  disabled={!changeText.trim()}
                  onClick={() => {
                    s.requestChanges(card.id, changeText.trim());
                    onClose();
                  }}
                >
                  Send to team
                </Button>
                <Button variant="ghost" onClick={() => setAskChanges(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-8 px-5 py-6 sm:px-7 md:grid-cols-[1fr_250px]">
        {/* main column */}
        <div className="min-w-0 space-y-7">
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Description</h3>
            {canEdit ? (
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => desc !== card.description && s.updateCard(card.id, { description: desc }, "updated the description")}
                rows={desc ? 4 : 2}
                placeholder="Add details, links, what “done” looks like…"
                className={cn(inputCls, "resize-y leading-relaxed")}
              />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{card.description || "No description."}</p>
            )}
          </section>

          {(card.checklist.length > 0 || canEdit) && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">Checklist</h3>
                {card.checklist.length > 0 && (
                  <span className="text-xs font-medium text-muted">
                    {checked} of {card.checklist.length}
                  </span>
                )}
              </div>
              {card.checklist.length > 0 && <Progress value={checked / card.checklist.length} className="mb-3" />}
              <ul className="space-y-1">
                {card.checklist.map((i) => (
                  <li key={i.id}>
                    <label className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5", canEdit && "cursor-pointer hover:bg-canvas")}>
                      <input type="checkbox" checked={i.done} disabled={!canEdit} onChange={() => s.toggleCheck(card.id, i.id)} className="h-4 w-4 accent-[var(--color-brand)]" />
                      <span className={cn("text-sm", i.done ? "text-faint line-through" : "text-ink")}>{i.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {canEdit && (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newCheck.trim()) s.addCheck(card.id, newCheck.trim());
                    setNewCheck("");
                  }}
                >
                  <input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} placeholder="Add an item" className={inputCls} />
                  <Button variant="outline" type="submit">
                    Add
                  </Button>
                </form>
              )}
            </section>
          )}

          <Attachments card={card} canEdit={canEdit} />

          <section>
            <div className="mb-3 flex gap-1 border-b border-line">
              {(["comments", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn("-mb-px border-b-2 px-3 pb-2 text-sm font-semibold capitalize", tab === t ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink")}
                >
                  {t === "comments" ? `Comments (${comments.length})` : "History"}
                </button>
              ))}
            </div>

            {tab === "comments" ? (
              <>
                <ul className="space-y-4">
                  {comments.map((c) => {
                    const u = userById(c.userId);
                    return (
                      <li key={c.id} className="flex gap-3">
                        <Avatar user={u} size={30} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted">
                            <span className="font-semibold text-ink">{u?.name}</span> · {timeAgo(c.at)}
                            {c.internal && <span className="ml-2 rounded bg-high-soft px-1.5 py-0.5 font-semibold text-high">Internal</span>}
                          </p>
                          <p className={cn("mt-1 rounded-lg px-3 py-2 text-sm leading-relaxed", c.internal ? "bg-high-soft/60" : "bg-canvas")}>{c.text}</p>
                        </div>
                      </li>
                    );
                  })}
                  {comments.length === 0 && <li className="text-sm text-muted">No comments yet.</li>}
                </ul>
                {s.me.role !== "viewer" && (
                  <form
                    className="mt-4 flex gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!comment.trim()) return;
                      s.addComment(card.id, comment.trim(), client ? false : internal);
                      setComment("");
                    }}
                  >
                    <Avatar user={s.me} size={30} />
                    <div className="flex-1">
                      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder={client ? "Write a message to the team…" : "Write a comment… use @Name to mention"} className={inputCls} />
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Button size="sm" type="submit" disabled={!comment.trim()}>
                          Comment
                        </Button>
                        {!client && (
                          <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[var(--color-high)]" />
                            Internal (hidden from client)
                          </label>
                        )}
                      </div>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <ul className="space-y-3">
                {card.history.map((h, i) => {
                  const u = userById(h.userId);
                  return (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Avatar user={u} size={24} />
                      <span className="text-ink-soft">
                        <span className="font-semibold text-ink">{u?.name.split(" ")[0]}</span> {h.text}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-faint">{timeAgo(h.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* side column */}
        <aside className="space-y-5 text-sm">
          {canEdit && (
            <Side label="Status">
              <select
                value={card.listId}
                onChange={(e) => {
                  const ids = s.cards.filter((c) => c.listId === e.target.value).sort((a, b) => a.order - b.order).map((c) => c.id);
                  const cols: Record<string, string[]> = {};
                  lists.forEach((l) => (cols[l.id] = s.cards.filter((c) => c.listId === l.id && c.id !== card.id).sort((a, b) => a.order - b.order).map((c) => c.id)));
                  cols[e.target.value] = [...ids.filter((x) => x !== card.id), card.id];
                  s.reorderBoard(card.boardId, cols, card.id);
                }}
                className={inputCls}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Side>
          )}

          <Side label="Assigned to">
            <div className="space-y-1.5">
              {card.assigneeIds.map((id) => {
                const u = userById(id);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <Avatar user={u} size={24} />
                    <span className="flex-1 truncate">{u?.name}</span>
                    {canEdit && (
                      <button onClick={() => s.setAssignees(card.id, card.assigneeIds.filter((x) => x !== id))} className="rounded p-0.5 text-faint hover:text-urgent" aria-label={`Remove ${u?.name}`}>
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {card.assigneeIds.length === 0 && <p className="text-muted">Nobody yet</p>}
              {canEdit && (
                <select value="" onChange={(e) => e.target.value && s.setAssignees(card.id, [...card.assigneeIds, e.target.value])} className={cn(inputCls, "mt-1")}>
                  <option value="">+ Assign a person</option>
                  {members
                    .filter((u) => !card.assigneeIds.includes(u.id) && u.role !== "client")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} – {u.title}
                      </option>
                    ))}
                </select>
              )}
              {!client && card.assignedBy && <p className="pt-1 text-xs text-faint">Assigned by {userById(card.assignedBy)?.name}</p>}
            </div>
          </Side>

          {!client && (
            <Side label="Team">
              {canEdit ? (
                <select value={card.teamId ?? ""} onChange={(e) => s.setTeam(card.id, e.target.value || undefined)} className={inputCls}>
                  <option value="">No team</option>
                  {s.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p>{team?.name ?? "–"}</p>
              )}
              {team && (
                <div className="mt-2">
                  {card.claimedBy ? (
                    <p className="text-xs text-muted">
                      Claimed by <span className="font-semibold text-ink">{userById(card.claimedBy)?.name}</span>
                    </p>
                  ) : isTeamMember ? (
                    <Button size="sm" className="w-full" onClick={() => s.claim(card.id)}>
                      Claim this task
                    </Button>
                  ) : (
                    <p className="text-xs font-medium text-high">Waiting for a {team.name} member to claim</p>
                  )}
                </div>
              )}
            </Side>
          )}

          <Side label="Due date">
            {canEdit ? (
              <input type="date" value={card.due ?? ""} onChange={(e) => s.updateCard(card.id, { due: e.target.value || undefined }, "changed the due date")} className={inputCls} />
            ) : (
              <DueChip due={card.due} done={done} />
            )}
          </Side>

          <Side label="Priority">
            {canEdit ? (
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => s.updateCard(card.id, { priority: p }, `set priority to ${PRIORITY[p].label}`)}
                    className={cn("rounded-lg border px-2 py-1.5 text-xs font-semibold", card.priority === p ? `${PRIORITY[p].bg} ${PRIORITY[p].text} border-transparent` : "border-line text-muted hover:border-line-strong")}
                  >
                    {PRIORITY[p].label}
                  </button>
                ))}
              </div>
            ) : (
              <PriorityPill p={card.priority} />
            )}
          </Side>

          {!client && (
            <Side label="Labels">
              <div className="flex flex-wrap gap-1.5">
                {s.labels.map((l) => {
                  const on = card.labels.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      disabled={!canEdit}
                      onClick={() => s.updateCard(card.id, { labels: on ? card.labels.filter((x) => x !== l.id) : [...card.labels, l.id] })}
                      className={cn("rounded-md border px-2 py-1 text-xs font-medium", on ? "border-transparent text-white" : "border-line text-muted hover:border-line-strong")}
                      style={on ? { background: labelById(l.id)?.color } : undefined}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </Side>
          )}

          {canEdit && board?.clientId && (
            <Side label="Client can see">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2">
                <span className="text-sm">{card.clientVisible ? "Visible in portal" : "Internal only"}</span>
                <input type="checkbox" checked={card.clientVisible} onChange={(e) => s.updateCard(card.id, { clientVisible: e.target.checked }, e.target.checked ? "made this visible to the client" : "hid this from the client")} className="h-4 w-4 accent-[var(--color-brand)]" />
              </label>
            </Side>
          )}

          {canEdit && (
            <div className="border-t border-line pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted"
                onClick={() => {
                  s.archiveCard(card.id, !card.archived);
                  onClose();
                }}
              >
                <Icon name="archive" size={16} /> {card.archived ? "Restore card" : "Archive card"}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}

function Side({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">{label}</p>
      {children}
    </div>
  );
}
