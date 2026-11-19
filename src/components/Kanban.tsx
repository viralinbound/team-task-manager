"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/lib/store";
import type { Card, List } from "@/lib/types";
import { cn } from "@/lib/format";
import { CardTile } from "./CardTile";
import { Button, Icon, inputCls } from "./ui";

type Cols = Record<string, string[]>;

export function Kanban({ boardId, onOpen, client, dim }: { boardId: string; onOpen: (id: string) => void; client?: boolean; dim?: (c: Card) => boolean }) {
  const s = useStore();
  const lists = useMemo(() => s.lists.filter((l) => l.boardId === boardId), [s.lists, boardId]);
  const cards = useMemo(() => s.cards.filter((c) => c.boardId === boardId && !c.archived && (!client || c.clientVisible)), [s.cards, boardId, client]);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const derive = (): Cols => {
    const cols: Cols = {};
    lists.forEach((l) => (cols[l.id] = cards.filter((c) => c.listId === l.id).sort((a, b) => a.order - b.order).map((c) => c.id)));
    return cols;
  };
  const [cols, setCols] = useState<Cols>(derive);
  const [activeId, setActiveId] = useState<string | null>(null);

  // keep in sync with the store whenever we are not mid-drag
  useEffect(() => {
    if (!activeId) setCols(derive());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, lists]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findCol = (id: string) => (id in cols ? id : Object.keys(cols).find((k) => cols[k].includes(id)));

  const onStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findCol(String(active.id));
    const to = findCol(String(over.id));
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const fromItems = prev[from].filter((x) => x !== active.id);
      const toItems = [...prev[to]];
      const overIndex = toItems.indexOf(String(over.id));
      const index = overIndex >= 0 ? overIndex : toItems.length;
      toItems.splice(index, 0, String(active.id));
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  const onEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    let next = cols;
    if (over) {
      const col = findCol(String(active.id));
      const overCol = findCol(String(over.id));
      if (col && col === overCol) {
        const oldI = cols[col].indexOf(String(active.id));
        const newI = cols[col].indexOf(String(over.id));
        if (newI >= 0 && oldI !== newI) next = { ...cols, [col]: arrayMove(cols[col], oldI, newI) };
      }
    }
    setCols(next);
    setActiveId(null);
    s.reorderBoard(boardId, next, String(active.id));
  };

  const active = activeId ? byId.get(activeId) : undefined;

  const columns = (
    <div className="scroll-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {lists.map((l) => (
        <Column key={l.id} list={l} ids={cols[l.id] ?? []} byId={byId} onOpen={onOpen} client={client} dim={dim} boardId={boardId} />
      ))}
      {!client && <AddList boardId={boardId} />}
    </div>
  );

  if (client) return columns;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => setActiveId(null)}>
      {columns}
      <DragOverlay>{active ? <CardTile card={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({ list, ids, byId, onOpen, client, dim, boardId }: { list: List; ids: string[]; byId: Map<string, Card>; onOpen: (id: string) => void; client?: boolean; dim?: (c: Card) => boolean; boardId: string }) {
  const { setNodeRef, isOver } = useDroppableSafe(list.id, client);
  const s = useStore();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const tone = list.kind === "approval" ? "bg-brand-soft/70" : list.kind === "requests" ? "bg-high-soft/50" : "bg-sunken/70";

  return (
    <div className={cn("flex max-h-[calc(100dvh-12rem)] w-[280px] shrink-0 snap-start flex-col rounded-2xl", tone, isOver && "ring-2 ring-brand/40")}>
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <h3 className="text-[13px] font-semibold text-ink">{list.name}</h3>
        <span className="rounded-full bg-surface/80 px-1.5 text-[11px] font-semibold text-muted">{ids.length}</span>
        {list.kind === "approval" && <span className="ml-auto text-[10px] font-semibold tracking-wide text-brand uppercase">Client</span>}
        {list.kind === "requests" && <span className="ml-auto text-[10px] font-semibold tracking-wide text-high uppercase">Incoming</span>}
      </div>
      <div ref={setNodeRef} className="scroll-thin flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {client ? (
          ids.map((id) => {
            const c = byId.get(id);
            return c ? <CardTile key={id} card={c} onOpen={() => onOpen(id)} client /> : null;
          })
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {ids.map((id) => {
              const c = byId.get(id);
              return c ? <SortableCard key={id} card={c} onOpen={() => onOpen(id)} dimmed={dim ? dim(c) : false} /> : null;
            })}
          </SortableContext>
        )}
        {ids.length === 0 && <p className="rounded-lg border border-dashed border-line-strong/70 py-5 text-center text-xs text-faint">{client ? "Nothing here" : "Drop cards here"}</p>}
      </div>
      {!client && (
        <div className="px-2 pb-2">
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) s.addCard(boardId, list.id, text.trim(), { clientVisible: !!s.boards.find((b) => b.id === boardId)?.clientId });
                setText("");
              }}
              className="rounded-xl bg-surface p-2 shadow-sm"
            >
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                  if (e.key === "Escape") setAdding(false);
                }}
                rows={2}
                placeholder="What needs doing?"
                className="w-full resize-none text-sm outline-none placeholder:text-faint"
              />
              <div className="mt-1 flex gap-1.5">
                <Button size="sm" type="submit">
                  Add card
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:bg-surface/70 hover:text-ink">
              <Icon name="plus" size={16} /> Add a card
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function useDroppableSafe(id: string, disabled?: boolean) {
  const d = useDroppable({ id, disabled });
  return d;
}

function SortableCard({ card, onOpen, dimmed }: { card: Card; onOpen: () => void; dimmed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("touch-manipulation outline-none", isDragging && "opacity-30", dimmed && "opacity-35")}
    >
      <CardTile card={card} onOpen={onOpen} />
    </div>
  );
}

function AddList({ boardId }: { boardId: string }) {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="w-[280px] shrink-0">
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) s.addList(boardId, name.trim());
            setName("");
            setOpen(false);
          }}
          className="rounded-2xl bg-sunken/70 p-2.5"
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" className={inputCls} />
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" type="submit">
              Add list
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="flex h-11 w-full items-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 text-sm font-medium text-muted hover:border-brand hover:text-ink">
          <Icon name="plus" size={16} /> Add another list
        </button>
      )}
    </div>
  );
}
