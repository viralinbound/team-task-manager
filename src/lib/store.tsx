"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "./seed";
import { TEMPLATES } from "./templates";
import type {
  Activity,
  Board,
  Card,
  Client,
  ClientRequest,
  Label,
  List,
  Notification,
  Priority,
  Team,
  User,
} from "./types";

/**
 * UI-only prototype store. Everything lives in memory (and in this browser's
 * localStorage so a refresh keeps your clicks). In Phase 1 this file is
 * replaced by Supabase queries with the same function names.
 */
interface Data {
  users: User[];
  teams: Team[];
  clients: Client[];
  boards: Board[];
  lists: List[];
  cards: Card[];
  labels: Label[];
  requests: ClientRequest[];
  notifications: Notification[];
  activity: Activity[];
  currentUserId: string;
}

const KEY = "workboard-demo-v3";
const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const initial = (): Data => ({
  users: seed.users,
  teams: seed.teams,
  clients: seed.clients,
  boards: seed.boards,
  lists: seed.lists,
  cards: seed.cards,
  labels: seed.labels,
  requests: seed.requests,
  notifications: seed.notifications,
  activity: seed.activity,
  currentUserId: "u-admin",
});

function useStoreValue() {
  const [data, setData] = useState<Data>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* storage blocked: run on seed data */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, hydrated]);

  const me = data.users.find((u) => u.id === data.currentUserId) ?? data.users[0];

  const log = (d: Data, text: string, boardId?: string): Activity[] => [
    { id: uid("ac"), at: now(), userId: d.currentUserId, text, boardId },
    ...d.activity,
  ];

  const notify = (d: Data, userIds: string[], text: string, href: string, kind: Notification["kind"]): Notification[] => [
    ...userIds
      .filter((id) => id !== d.currentUserId)
      .map((userId) => ({ id: uid("n"), userId, text, at: now(), read: false, href, kind })),
    ...d.notifications,
  ];

  const patchCard = (d: Data, id: string, patch: Partial<Card>, historyText?: string): Card[] =>
    d.cards.map((c) =>
      c.id === id
        ? {
            ...c,
            ...patch,
            history: historyText ? [{ at: now(), userId: d.currentUserId, text: historyText }, ...c.history] : c.history,
          }
        : c,
    );

  const name = (d: Data, id: string) => d.users.find((u) => u.id === id)?.name.split(" ")[0] ?? "Someone";

  const actions = {
    switchUser: (id: string) => setData((d) => ({ ...d, currentUserId: id })),
    resetDemo: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      setData(initial());
    },

    /** Commit a full column layout after a drag. */
    reorderBoard: (boardId: string, columns: Record<string, string[]>, movedId?: string) =>
      setData((d) => {
        const pos = new Map<string, { listId: string; order: number }>();
        Object.entries(columns).forEach(([listId, ids]) => ids.forEach((id, i) => pos.set(id, { listId, order: i })));
        const moved = movedId ? d.cards.find((c) => c.id === movedId) : undefined;
        const target = movedId ? pos.get(movedId) : undefined;
        const changedList = moved && target && moved.listId !== target.listId;
        const listName = changedList ? d.lists.find((l) => l.id === target!.listId)?.name : undefined;
        const targetList = changedList ? d.lists.find((l) => l.id === target!.listId) : undefined;
        let cards = d.cards.map((c) => (c.boardId === boardId && pos.has(c.id) ? { ...c, ...pos.get(c.id)! } : c));
        let notifications = d.notifications;
        if (changedList && moved) {
          cards = cards.map((c) =>
            c.id === moved.id ? { ...c, history: [{ at: now(), userId: d.currentUserId, text: `moved this to ${listName}` }, ...c.history] } : c,
          );
          if (targetList?.kind === "approval") {
            const board = d.boards.find((b) => b.id === boardId);
            const clientUsers = d.users.filter((u) => u.role === "client" && u.clientId === board?.clientId).map((u) => u.id);
            notifications = notify(d, clientUsers, `“${moved.title}” is ready for your approval`, `/portal/boards/${boardId}?card=${moved.id}`, "approval");
          }
        }
        return {
          ...d,
          cards,
          notifications,
          activity: changedList && moved ? log(d, `moved “${moved.title}” to ${listName}`, boardId) : d.activity,
        };
      }),

    addCard: (boardId: string, listId: string, title: string, extra: Partial<Card> = {}) => {
      const id = uid("k");
      setData((d) => {
        const order = Math.max(-1, ...d.cards.filter((c) => c.listId === listId).map((c) => c.order)) + 1;
        const c: Card = {
          id,
          boardId,
          listId,
          order,
          title,
          description: "",
          assigneeIds: [],
          assignedBy: d.currentUserId,
          priority: "medium" as Priority,
          labels: [],
          checklist: [],
          comments: [],
          clientVisible: true,
          createdAt: now(),
          history: [{ at: now(), userId: d.currentUserId, text: "created this card" }],
          attachments: [],
          ...extra,
        };
        return {
          ...d,
          cards: [...d.cards, c],
          notifications: notify(d, c.assigneeIds, `${name(d, d.currentUserId)} assigned you “${title}”`, `/boards/${boardId}?card=${id}`, "assigned"),
          activity: log(d, `created “${title}”`, boardId),
        };
      });
      return id;
    },

    updateCard: (id: string, patch: Partial<Card>, historyText?: string) =>
      setData((d) => ({ ...d, cards: patchCard(d, id, patch, historyText) })),

    setAssignees: (id: string, assigneeIds: string[]) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        const added = assigneeIds.filter((a) => !c.assigneeIds.includes(a));
        return {
          ...d,
          cards: patchCard(d, id, { assigneeIds, assignedBy: d.currentUserId }, added.length ? `assigned ${added.map((a) => name(d, a)).join(", ")}` : "changed assignees"),
          notifications: notify(d, added, `${name(d, d.currentUserId)} assigned you “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "assigned"),
          activity: added.length ? log(d, `assigned “${c.title}” to ${added.map((a) => name(d, a)).join(", ")}`, c.boardId) : d.activity,
        };
      }),

    setTeam: (id: string, teamId: string | undefined) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        const team = d.teams.find((t) => t.id === teamId);
        const members = d.users.filter((u) => teamId && u.teamIds.includes(teamId)).map((u) => u.id);
        return {
          ...d,
          cards: patchCard(d, id, { teamId, claimedBy: undefined }, team ? `assigned the ${team.name} team` : "removed the team"),
          notifications: team ? notify(d, members, `New ${team.name} task waiting to be claimed: “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "team") : d.notifications,
          activity: team ? log(d, `assigned “${c.title}” to ${team.name}`, c.boardId) : d.activity,
        };
      }),

    claim: (id: string) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        return {
          ...d,
          cards: patchCard(d, id, { claimedBy: d.currentUserId, assigneeIds: Array.from(new Set([...c.assigneeIds, d.currentUserId])) }, "claimed this team task"),
          activity: log(d, `claimed “${c.title}”`, c.boardId),
        };
      }),

    addComment: (id: string, text: string, internal: boolean) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        const mentioned = d.users.filter((u) => text.includes(`@${u.name.split(" ")[0]}`)).map((u) => u.id);
        let notifications = notify(d, c.assigneeIds.filter((a) => !mentioned.includes(a)), `${name(d, d.currentUserId)} commented on “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "comment");
        notifications = notify({ ...d, notifications }, mentioned, `${name(d, d.currentUserId)} mentioned you on “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "mention");
        return {
          ...d,
          cards: d.cards.map((x) => (x.id === id ? { ...x, comments: [...x.comments, { id: uid("m"), userId: d.currentUserId, text, internal, at: now() }] } : x)),
          notifications,
        };
      }),

    toggleCheck: (id: string, itemId: string) =>
      setData((d) => ({
        ...d,
        cards: d.cards.map((c) => (c.id === id ? { ...c, checklist: c.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : c)),
      })),

    addCheck: (id: string, text: string) =>
      setData((d) => ({
        ...d,
        cards: d.cards.map((c) => (c.id === id ? { ...c, checklist: [...c.checklist, { id: uid("x"), text, done: false }] } : c)),
      })),

    archiveCard: (id: string, archived = true) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        return { ...d, cards: patchCard(d, id, { archived }, archived ? "archived this card" : "restored this card"), activity: log(d, `${archived ? "archived" : "restored"} “${c.title}”`, c.boardId) };
      }),

    approve: (id: string) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        const done = d.lists.find((l) => l.boardId === c.boardId && l.kind === "done");
        return {
          ...d,
          cards: patchCard(d, id, { listId: done?.id ?? c.listId, order: -1 }, "approved this (client)"),
          notifications: notify(d, c.assigneeIds, `${name(d, d.currentUserId)} approved “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "approval"),
          activity: log(d, `approved “${c.title}”`, c.boardId),
        };
      }),

    requestChanges: (id: string, text: string) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        const doing = d.lists.find((l) => l.boardId === c.boardId && l.name === "In Progress");
        const cards = patchCard(d, id, { listId: doing?.id ?? c.listId, order: -1 }, "asked for changes (client)").map((x) =>
          x.id === id ? { ...x, comments: [...x.comments, { id: uid("m"), userId: d.currentUserId, text, internal: false, at: now() }] } : x,
        );
        return {
          ...d,
          cards,
          notifications: notify(d, c.assigneeIds, `${name(d, d.currentUserId)} asked for changes on “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "approval"),
          activity: log(d, `asked for changes on “${c.title}”`, c.boardId),
        };
      }),

    addRequest: (r: Omit<ClientRequest, "id" | "at" | "status" | "by">) =>
      setData((d) => {
        const reqList = d.lists.find((l) => l.boardId === r.boardId && l.kind === "requests");
        const cardId = uid("k");
        const board = d.boards.find((b) => b.id === r.boardId);
        const admins = d.users.filter((u) => u.role === "admin" || (board?.memberIds.includes(u.id) && u.teamIds.includes("t-sales"))).map((u) => u.id);
        const newCard: Card = {
          id: cardId,
          boardId: r.boardId,
          listId: reqList?.id ?? d.lists.find((l) => l.boardId === r.boardId)!.id,
          order: -1,
          title: r.title,
          description: r.description,
          assigneeIds: [],
          assignedBy: d.currentUserId,
          priority: r.priority,
          due: r.wantedBy,
          labels: [],
          checklist: [],
          comments: [],
          clientVisible: true,
          createdAt: now(),
          history: [{ at: now(), userId: d.currentUserId, text: "raised this as a client request" }],
          attachments: [],
        };
        return {
          ...d,
          requests: [{ ...r, id: uid("r"), at: now(), status: "new", by: d.currentUserId }, ...d.requests],
          cards: [...d.cards, newCard],
          notifications: notify(d, admins, `${name(d, d.currentUserId)} raised a new request: “${r.title}”`, `/boards/${r.boardId}?card=${cardId}`, "request"),
          activity: log(d, `raised a request “${r.title}”`, r.boardId),
        };
      }),

    markRead: (id: string) => setData((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: () => setData((d) => ({ ...d, notifications: d.notifications.map((n) => (n.userId === d.currentUserId ? { ...n, read: true } : n)) })),

    /** Create a project from a template: its lists, plus any starter cards. */
    addBoard: (b: Omit<Board, "id">, templateId = b.clientId ? "client" : "blank") => {
      const id = uid("b");
      const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
      const lists: List[] = tpl.lists.map((l, i) => ({ id: `${id}-l${i}`, boardId: id, name: l.name, kind: l.kind }));
      setData((d) => {
        const starter: Card[] = tpl.starter.map(([li, title], i) => ({
          id: uid("k"),
          boardId: id,
          listId: lists[li].id,
          order: i,
          title,
          description: "",
          assigneeIds: [],
          assignedBy: d.currentUserId,
          priority: "medium",
          labels: [],
          checklist: [],
          comments: [],
          clientVisible: !!b.clientId,
          createdAt: now(),
          history: [{ at: now(), userId: d.currentUserId, text: `added from the ${tpl.name} template` }],
          attachments: [],
        }));
        return {
          ...d,
          boards: [...d.boards, { cover: `https://picsum.photos/seed/cover-${id}/640/260`, status: "active", ...b, id }],
          lists: [...d.lists, ...lists],
          cards: [...d.cards, ...starter],
          notifications: notify(d, b.memberIds, `${name(d, d.currentUserId)} added you to the project “${b.name}”`, `/boards/${id}`, "team"),
          activity: log(d, `created project “${b.name}”`, id),
        };
      });
      return id;
    },
    updateBoard: (id: string, patch: Partial<Board>) => setData((d) => ({ ...d, boards: d.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

    addList: (boardId: string, name: string) => setData((d) => ({ ...d, lists: [...d.lists, { id: uid("l"), boardId, name }] })),
    renameList: (id: string, name: string) => setData((d) => ({ ...d, lists: d.lists.map((l) => (l.id === id ? { ...l, name } : l)) })),
    toggleStar: (id: string) => setData((d) => ({ ...d, boards: d.boards.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b)) })),

    addClient: (c: Omit<Client, "id">) =>
      setData((d) => {
        const id = uid("c");
        return { ...d, clients: [...d.clients, { image: `https://picsum.photos/seed/client-${id}/200/200`, ...c, id }], activity: log(d, `added client “${c.name}”`) };
      }),
    inviteUser: (u: Omit<User, "id">) => setData((d) => ({ ...d, users: [...d.users, { ...u, id: uid("u") }], activity: log(d, `invited ${u.name}`) })),
    addTeam: (name: string, color: string) => setData((d) => ({ ...d, teams: [...d.teams, { id: uid("t"), name, color }] })),
  };

  return { ...data, me, hydrated, ...actions };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

/** Derived helpers used across screens. */
export function useHelpers() {
  const s = useStore();
  const userById = useCallback((id?: string) => s.users.find((u) => u.id === id), [s.users]);
  const teamById = useCallback((id?: string) => s.teams.find((t) => t.id === id), [s.teams]);
  const clientById = useCallback((id?: string) => s.clients.find((c) => c.id === id), [s.clients]);
  const boardById = useCallback((id?: string) => s.boards.find((b) => b.id === id), [s.boards]);
  const listById = useCallback((id?: string) => s.lists.find((l) => l.id === id), [s.lists]);
  const labelById = useCallback((id?: string) => s.labels.find((l) => l.id === id), [s.labels]);
  const isDone = useCallback((c: Card) => s.lists.find((l) => l.id === c.listId)?.kind === "done", [s.lists]);

  /** Boards the current user may open. */
  const visibleBoards = useMemo(() => {
    if (s.me.role === "admin") return s.boards;
    if (s.me.role === "client") return s.boards.filter((b) => b.clientId === s.me.clientId);
    return s.boards.filter((b) => b.memberIds.includes(s.me.id));
  }, [s.boards, s.me]);

  return { userById, teamById, clientById, boardById, listById, labelById, isDone, visibleBoards };
}
