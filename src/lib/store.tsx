"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as seed from "./seed";
import { TEMPLATES, type ProjectTemplate, type TemplateCard } from "./templates";
import type { TrelloImport } from "./trello";
import { LIVE, supabase } from "./supabase/client";
import { attachmentUrl, clientReview, fileSize, loadAll, pushChanges, removeAttachment as deleteFile, saveInvite, uploadAttachment, uploadAvatar } from "./live";
import type {
  Activity,
  Attachment,
  Board,
  Card,
  ChecklistItem,
  FieldDef,
  FieldValue,
  Pin,
  TimeEntry,
  Client,
  ClientRequest,
  Label,
  List,
  Notification,
  Priority,
  Repeat,
  Team,
  User,
} from "./types";

/**
 * The app's data store. Two modes, same screens:
 *  - Demo (no Supabase keys): sample data in this browser's localStorage.
 *  - Live (keys set): loads what the signed-in person may see from Supabase,
 *    applies each click straight away on screen, then writes the changed rows
 *    (see live.ts). Changes from other people arrive through Supabase Realtime.
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
  templates: ProjectTemplate[];
  timeEntries: TimeEntry[];
  pins: Pin[];
  currentUserId: string;
}

const KEY = "workboard-demo-v3";
const now = () => new Date().toISOString();
// Real UUIDs, so new rows can be shown on screen before the database confirms them.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const uid = (_prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (ch) => (+ch ^ (Math.random() * 16) >> (+ch / 4)).toString(16));

const EMPTY: Data = { users: [], teams: [], clients: [], boards: [], lists: [], cards: [], labels: [], requests: [], notifications: [], activity: [], templates: [], timeEntries: [], pins: [], currentUserId: "" };
const NOBODY: User = { id: "", name: "", email: "", role: "viewer", title: "", teamIds: [], color: "#1f6f5c" };

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
/** Next due date for a repeating task, never in the past. */
export function nextDue(due: string | undefined, rule: Repeat): string {
  const today = isoDay(new Date());
  let d = new Date(`${due ?? today}T00:00:00Z`);
  do {
    if (rule === "daily") d = new Date(d.getTime() + DAY_MS);
    else if (rule === "weekly") d = new Date(d.getTime() + 7 * DAY_MS);
    else d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  } while (isoDay(d) < today);
  return isoDay(d);
}

/** Move `d` by the same number of days that `from` moves to reach `to`. */
function shiftDate(d: string | undefined, from: string | undefined, to: string): string | undefined {
  if (!d || !from) return d;
  const delta = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return isoDay(new Date(new Date(`${d}T00:00:00Z`).getTime() + delta));
}

/**
 * When a repeating task moves into a Done column: it stops repeating, and the next one is created.
 * Live mode only clears the flag here; the database trigger creates the next task (so it also works
 * for client approvals and other people's screens).
 */
function applyRepeats(prev: Data, next: Data): Data {
  if (prev === next || prev.cards === next.cards) return next;
  const doneLists = new Set(next.lists.filter((l) => l.kind === "done").map((l) => l.id));
  const before = new Map(prev.cards.map((c) => [c.id, c]));
  const spawned: Card[] = [];
  let changed = false;
  const cards = next.cards.map((c) => {
    const old = before.get(c.id);
    const rule = c.repeat ?? old?.repeat;
    if (!rule || !old || old.listId === c.listId || !doneLists.has(c.listId)) return c;
    changed = true;
    if (!LIVE) {
      const boardLists = next.lists.filter((l) => l.boardId === c.boardId);
      const target = boardLists.find((l) => !l.kind) ?? boardLists[0];
      spawned.push({
        ...c,
        id: uid("k"),
        listId: target.id,
        order: -1,
        due: nextDue(c.due, rule),
        checklist: c.checklist.map((i) => ({ ...i, done: false, due: shiftDate(i.due, c.due, nextDue(c.due, rule)) })),
        comments: [],
        attachments: [],
        archived: false,
        repeat: rule,
        createdAt: new Date().toISOString(),
        history: [{ at: new Date().toISOString(), userId: next.currentUserId, text: `repeats ${rule} (created automatically)` }],
      });
    }
    return { ...c, repeat: undefined };
  });
  return changed ? { ...next, cards: [...cards, ...spawned] } : next;
}

const initial = (): Data => (LIVE ? EMPTY : {
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
  templates: [],
  timeEntries: [],
  pins: [],
  currentUserId: "u-admin",
});

function useStoreValue() {
  const [data, setDataRaw] = useState<Data>(initial);
  // Every change passes through here so recurring tasks behave the same everywhere (drag, status menu, client approval).
  const setData = useCallback((next: Data | ((d: Data) => Data)) => {
    setDataRaw((prev) => applyRepeats(prev, typeof next === "function" ? next(prev) : next));
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // live-mode bookkeeping
  const synced = useRef<Data | null>(null); // what the database is known to hold
  const queue = useRef<Promise<void>>(Promise.resolve()); // writes run one after another
  const pending = useRef(0);
  const wantReload = useRef(false);

  const reload = useCallback(async () => {
    if (!LIVE) return;
    if (pending.current > 0) {
      wantReload.current = true; // wait until our own writes land, so the screen never jumps back
      return;
    }
    wantReload.current = false;
    try {
      const {
        data: { user },
      } = await supabase().auth.getUser();
      if (!user) {
        // Signed out (e.g. on /login). The middleware guards every other page, so just stay empty.
        if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
        return;
      }
      const d = await loadAll(user.id);
      if (pending.current > 0) {
        wantReload.current = true;
        return;
      }
      synced.current = d;
      setData(d);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setHydrated(true);
    }
  }, []);

  // first load
  useEffect(() => {
    if (LIVE) {
      reload();
      return;
    }
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...initial(), ...JSON.parse(raw) }); // older saved demos lack newer collections
    } catch {
      /* storage blocked: run on seed data */
    }
    setHydrated(true);
  }, [reload]);

  // live: other people's changes arrive here
  useEffect(() => {
    if (!LIVE || !hydrated || !data.currentUserId) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const ch = supabase()
      .channel("workboard")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        clearTimeout(t);
        t = setTimeout(reload, 400);
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase().removeChannel(ch);
    };
  }, [hydrated, data.currentUserId, reload]);

  // save: demo keeps a local copy; live writes the rows that changed
  useEffect(() => {
    if (!hydrated) return;
    if (!LIVE) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        /* ignore */
      }
      return;
    }
    const before = synced.current;
    if (!before || before === data) return;
    synced.current = data;
    const role = data.users.find((x) => x.id === data.currentUserId)?.role ?? "viewer";
    pending.current++;
    queue.current = queue.current
      .then(() => pushChanges(before, data, role))
      .catch((e) => {
        setNotice({ tone: "error", text: `Couldn't save: ${e instanceof Error ? e.message : e}` });
        wantReload.current = true;
      })
      .finally(() => {
        pending.current--;
        if (pending.current === 0 && wantReload.current) reload();
      });
  }, [data, hydrated, reload]);

  /** Run a database call after any queued writes (used for client review). */
  const enqueue = (fn: () => Promise<void>) => {
    pending.current++;
    queue.current = queue.current
      .then(fn)
      .catch((e) => setNotice({ tone: "error", text: `Couldn't save: ${e instanceof Error ? e.message : e}` }))
      .finally(() => {
        pending.current--;
        wantReload.current = true;
        if (pending.current === 0) reload();
      });
  };

  const me = data.users.find((u) => u.id === data.currentUserId) ?? (LIVE ? NOBODY : data.users[0]);

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

  const uploadFiles = async (boardId: string, cardId: string, files: File[]): Promise<Attachment[]> =>
    LIVE
      ? Promise.all(files.map((f) => uploadAttachment(boardId, cardId, f)))
      : files.map((f) => {
          const url = URL.createObjectURL(f);
          return { id: uid("a"), name: f.name, size: fileSize(f.size), type: f.type || undefined, url, thumb: f.type.startsWith("image/") ? url : undefined };
        });

  const actions = {
    switchUser: (id: string) => {
      if (!LIVE) setData((d) => ({ ...d, currentUserId: id }));
    },
    signOut: async () => {
      if (LIVE) await supabase().auth.signOut();
      window.location.href = "/login";
    },
    dismissNotice: () => setNotice(null),
    resetDemo: () => {
      if (LIVE) return;
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

    /** Subtask owner / due date / text. Notifies a newly chosen owner. */
    updateCheck: (id: string, itemId: string, patch: Partial<Omit<ChecklistItem, "id">>) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === id);
        if (!c) return d;
        const item = c.checklist.find((i) => i.id === itemId);
        const newOwner = patch.assigneeId && patch.assigneeId !== item?.assigneeId ? patch.assigneeId : undefined;
        return {
          ...d,
          cards: d.cards.map((x) => (x.id === id ? { ...x, checklist: x.checklist.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : x)),
          notifications: newOwner
            ? notify(d, [newOwner], `${name(d, d.currentUserId)} gave you a subtask: “${patch.text ?? item?.text}” on “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "assigned")
            : d.notifications,
        };
      }),
    removeCheck: (id: string, itemId: string) =>
      setData((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, checklist: c.checklist.filter((i) => i.id !== itemId) } : c)) })),

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

    approve: (id: string) => {
      if (LIVE) enqueue(() => clientReview(id, true));
      setData((d) => {
        const c = d.cards.find((x) => x.id === id)!;
        const done = d.lists.find((l) => l.boardId === c.boardId && l.kind === "done");
        return {
          ...d,
          cards: patchCard(d, id, { listId: done?.id ?? c.listId, order: -1 }, "approved this (client)"),
          notifications: notify(d, c.assigneeIds, `${name(d, d.currentUserId)} approved “${c.title}”`, `/boards/${c.boardId}?card=${id}`, "approval"),
          activity: log(d, `approved “${c.title}”`, c.boardId),
        };
      });
    },

    requestChanges: (id: string, text: string) => {
      if (LIVE) enqueue(() => clientReview(id, false));
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
      });
    },

    addRequest: (r: Omit<ClientRequest, "id" | "at" | "status" | "by">, extra: { cardId?: string; attachments?: Attachment[] } = {}) =>
      setData((d) => {
        const reqList = d.lists.find((l) => l.boardId === r.boardId && l.kind === "requests");
        const cardId = extra.cardId ?? uid("k");
        const board = d.boards.find((b) => b.id === r.boardId);
        const admins = d.users.filter((u) => u.role === "admin" || (board?.memberIds.includes(u.id) && u.teamIds.some((t) => d.teams.find((x) => x.id === t)?.name === "Sales"))).map((u) => u.id);
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
          attachments: extra.attachments ?? [],
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
      const tpl = TEMPLATES.find((x) => x.id === templateId) ?? data.templates.find((x) => x.id === templateId) ?? TEMPLATES[0];
      const lists: List[] = tpl.lists.map((l) => ({ id: uid("l"), boardId: id, name: l.name, kind: l.kind }));
      const specs: TemplateCard[] = [...tpl.starter.map(([list, title]) => ({ list, title })), ...(tpl.cards ?? [])];
      setData((d) => {
        const labelIds = new Set(d.labels.map((l) => l.id));
        const starter: Card[] = specs.map((sp, i) => ({
          id: uid("k"),
          boardId: id,
          listId: (lists[sp.list] ?? lists[0]).id,
          order: i,
          title: sp.title,
          description: sp.description ?? "",
          assigneeIds: [],
          assignedBy: d.currentUserId,
          priority: sp.priority ?? "medium",
          labels: (sp.labels ?? []).filter((l) => labelIds.has(l)),
          checklist: (sp.checklist ?? []).map((text) => ({ id: uid("x"), text, done: false })),
          comments: [],
          clientVisible: sp.clientVisible ?? !!b.clientId,
          createdAt: now(),
          history: [{ at: now(), userId: d.currentUserId, text: `added from the ${tpl.name} template` }],
          attachments: [],
          custom: sp.custom ?? {},
        }));
        return {
          ...d,
          boards: [...d.boards, { cover: `https://picsum.photos/seed/cover-${id}/640/260`, status: "active", fields: tpl.fields ?? [], ...b, id }],
          lists: [...d.lists, ...lists],
          cards: [...d.cards, ...starter],
          notifications: notify(d, b.memberIds, `${name(d, d.currentUserId)} added you to the project “${b.name}”`, `/boards/${id}`, "team"),
          activity: log(d, `created project “${b.name}”`, id),
        };
      });
      return id;
    },

    /**
     * Create a project from a Trello export. Cards come in unassigned and hidden from the client
     * (safer: old Trello boards often hold internal notes); old Trello comments become internal comments.
     */
    importTrello: (tr: TrelloImport, opts: { name: string; clientId?: string; memberIds: string[] }) => {
      const id = uid("b");
      const lists: List[] = tr.lists.map((l) => ({ id: uid("l"), boardId: id, name: l.name, kind: l.kind }));
      if (!lists.some((l) => l.kind === "done")) lists.push({ id: uid("l"), boardId: id, name: "Done", kind: "done" });
      setData((d) => {
        const labels = [...d.labels];
        const labelId = (name: string) => {
          const hit = labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
          if (hit) return hit.id;
          const src = tr.labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
          const nl = { id: uid("lb"), name: name.slice(0, 40), color: src?.color ?? "#6d5bd0" };
          labels.push(nl);
          return nl.id;
        };
        const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
        const cards: Card[] = tr.cards.map((c, i) => ({
          id: uid("k"),
          boardId: id,
          listId: lists[c.list].id,
          order: i,
          title: c.title,
          description: c.description,
          assigneeIds: [],
          assignedBy: d.currentUserId,
          priority: c.priority,
          due: c.due,
          labels: c.labels.map(labelId),
          checklist: c.checklist.map((x) => ({ id: uid("x"), text: x.text, done: x.done })),
          comments: c.comments.map((m) => ({ id: uid("m"), userId: d.currentUserId, text: `From Trello · ${m.author}${m.at ? `, ${fmt(m.at)}` : ""}:
${m.text}`.slice(0, 10000), internal: true, at: m.at || now() })),
          clientVisible: false,
          createdAt: now(),
          history: [{ at: now(), userId: d.currentUserId, text: "imported from Trello" }],
          attachments: [],
        }));
        return {
          ...d,
          labels,
          boards: [...d.boards, { id, name: opts.name, clientId: opts.clientId, color: "#1f6f5c", memberIds: opts.memberIds, cover: `https://picsum.photos/seed/cover-${id}/640/260`, status: "active", description: tr.description || undefined, fields: [] }],
          lists: [...d.lists, ...lists],
          cards: [...d.cards, ...cards],
          notifications: notify(d, opts.memberIds, `${name(d, d.currentUserId)} added you to the project “${opts.name}”`, `/boards/${id}`, "team"),
          activity: log(d, `imported “${opts.name}” from Trello (${cards.length} cards)`, id),
        };
      });
      return id;
    },

    /** Snapshot a project (columns, open tasks, subtasks, labels, fields) as a reusable template. */
    saveTemplate: (boardId: string, tplName: string, blurb: string) => {
      const id = uid("tp");
      setData((d) => {
        const board = d.boards.find((x) => x.id === boardId);
        const lists = d.lists.filter((l) => l.boardId === boardId);
        const cards: TemplateCard[] = d.cards
          .filter((c) => c.boardId === boardId && !c.archived && lists.find((l) => l.id === c.listId)?.kind !== "done")
          .sort((a, c) => lists.findIndex((l) => l.id === a.listId) - lists.findIndex((l) => l.id === c.listId) || a.order - c.order)
          .map((c) => ({
            list: lists.findIndex((l) => l.id === c.listId),
            title: c.title,
            description: c.description || undefined,
            priority: c.priority,
            labels: c.labels,
            checklist: c.checklist.map((i) => i.text),
            clientVisible: c.clientVisible,
          }));
        const tpl: ProjectTemplate = {
          id,
          name: tplName,
          blurb: blurb || `From “${board?.name}”: ${lists.length} columns, ${cards.length} tasks`,
          lists: lists.map((l) => ({ name: l.name, kind: l.kind })),
          starter: [],
          cards,
          fields: board?.fields ?? [],
          saved: true,
          createdBy: d.currentUserId,
        };
        return { ...d, templates: [...d.templates, tpl], activity: log(d, `saved “${board?.name}” as the template “${tplName}”`, boardId) };
      });
      return id;
    },
    deleteTemplate: (id: string) => setData((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== id) })),

    /** Custom fields: definitions on the project, values on each task. */
    setFields: (boardId: string, fields: FieldDef[]) => setData((d) => ({ ...d, boards: d.boards.map((x) => (x.id === boardId ? { ...x, fields } : x)) })),
    setCustom: (cardId: string, fieldId: string, value: FieldValue | undefined) =>
      setData((d) => ({
        ...d,
        cards: d.cards.map((c) => {
          if (c.id !== cardId) return c;
          const custom = { ...(c.custom ?? {}) };
          if (value === undefined || value === "") delete custom[fieldId];
          else custom[fieldId] = value;
          return { ...c, custom };
        }),
      })),

    /** Time tracking (internal). */
    logTime: (cardId: string, minutes: number, note = "", spentOn?: string) =>
      setData((d) => {
        const c = d.cards.find((x) => x.id === cardId);
        if (!c || minutes < 1) return d;
        const entry: TimeEntry = {
          id: uid("te"),
          cardId,
          boardId: c.boardId,
          userId: d.currentUserId,
          minutes: Math.min(Math.round(minutes), 1440),
          note: note.slice(0, 500),
          spentOn: spentOn ?? new Date().toLocaleDateString("en-CA"),
          at: now(),
        };
        return { ...d, timeEntries: [entry, ...d.timeEntries] };
      }),
    /** Design proofing: a comment pinned to a spot on an image. */
    addPin: (cardId: string, attachmentId: string, x: number, y: number, text: string, internal: boolean) =>
      setData((d) => {
        const c = d.cards.find((k) => k.id === cardId);
        if (!c || !text.trim()) return d;
        const pin: Pin = { id: uid("p"), cardId, boardId: c.boardId, attachmentId, x, y, text: text.trim().slice(0, 2000), internal, resolved: false, userId: d.currentUserId, at: now() };
        const me = d.users.find((u) => u.id === d.currentUserId);
        // the team hears about every new pin; a client's pin also reaches admins
        const to = me?.role === "client" ? Array.from(new Set([...c.assigneeIds, ...d.users.filter((u) => u.role === "admin").map((u) => u.id)])) : c.assigneeIds;
        return {
          ...d,
          pins: [...d.pins, pin],
          notifications: notify(d, to, `${name(d, d.currentUserId)} left design feedback on “${c.title}”`, `/boards/${c.boardId}?card=${cardId}`, "comment"),
        };
      }),
    togglePin: (id: string) => setData((d) => ({ ...d, pins: d.pins.map((p) => (p.id === id ? { ...p, resolved: !p.resolved } : p)) })),
    removePin: (id: string) => setData((d) => ({ ...d, pins: d.pins.filter((p) => p.id !== id) })),

    removeTime: (id: string) => setData((d) => ({ ...d, timeEntries: d.timeEntries.filter((e) => e.id !== id) })),

    /** Upload files to a task. Live: private storage bucket; demo: in-browser previews. */
    attachFiles: async (cardId: string, files: File[]) => {
      const card = data.cards.find((c) => c.id === cardId);
      if (!card || !files.length) return;
      let added: Attachment[];
      try {
        added = await uploadFiles(card.boardId, cardId, files);
      } catch (e) {
        setNotice({ tone: "error", text: `Couldn't upload: ${e instanceof Error ? e.message : e}` });
        return;
      }
      setData((d) => ({
        ...d,
        cards: patchCard(d, cardId, { attachments: [...(d.cards.find((c) => c.id === cardId)?.attachments ?? []), ...added] }, `attached ${added.map((a) => a.name).join(", ")}`),
      }));
    },
    /** Upload files for a task that doesn't exist yet (client requests): returns what to attach. */
    uploadFiles: (boardId: string, cardId: string, files: File[]) => uploadFiles(boardId, cardId, files),
    removeAttachment: (cardId: string, attachmentId: string) => {
      const a = data.cards.find((c) => c.id === cardId)?.attachments.find((x) => x.id === attachmentId);
      if (!a) return;
      setData((d) => ({ ...d, cards: patchCard(d, cardId, { attachments: (d.cards.find((c) => c.id === cardId)?.attachments ?? []).filter((x) => x.id !== attachmentId) }, `removed ${a.name}`) }));
      if (LIVE && a.path) enqueue(() => deleteFile(a.path!));
    },
    /** A link that opens the file: a short-lived signed link when live. */
    fileUrl: async (a: Attachment) => (LIVE && a.path ? attachmentUrl(a.path) : a.url ?? a.thumb ?? ""),

    /** Your own name, title and photo. */
    updateMe: (patch: Partial<Pick<User, "name" | "title" | "photo" | "emailAlerts" | "emailDigest">>) =>
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === d.currentUserId ? { ...x, ...patch } : x)) })),
    uploadPhoto: async (file: File): Promise<string> => {
      if (LIVE) return uploadAvatar(data.currentUserId, file);
      return new Promise((ok, fail) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => fail(r.error);
        r.readAsDataURL(file);
      });
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
    inviteUser: (u: Omit<User, "id">) => {
      if (!LIVE) {
        setData((d) => ({ ...d, users: [...d.users, { ...u, id: uid("u") }], activity: log(d, `invited ${u.name}`) }));
        return;
      }
      // Live: save the invite; they get this role the first time they sign in with that email.
      enqueue(async () => {
        await saveInvite(u, data.currentUserId);
        setNotice({ tone: "ok", text: `Invite saved for ${u.email}. Ask ${u.name.split(" ")[0]} to sign in at ${window.location.origin}/login with that email.` });
      });
      setData((d) => ({ ...d, activity: log(d, `invited ${u.name}`) }));
    },
    addTeam: (name: string, color: string) => setData((d) => ({ ...d, teams: [...d.teams, { id: uid("t"), name, color }] })),
  };

  return { ...data, me, hydrated, live: LIVE, loadError, notice, reload, ...actions };
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
