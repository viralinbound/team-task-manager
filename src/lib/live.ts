import { supabase } from "./supabase/client";
import type { Activity, Attachment, Board, Card, Client, ClientRequest, Comment, Label, List, Notification, Team, TimeEntry, User } from "./types";
import type { ProjectTemplate } from "./templates";

/**
 * The bridge between the app's in-memory data and the database.
 *  - loadAll(): reads everything this person is allowed to see (the database filters it)
 *  - pushChanges(): compares before/after and writes only the rows that changed
 * The screens never talk to the database directly, so the demo and the live app share every screen.
 */

export interface LiveData {
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
  currentUserId: string;
}

type Row = Record<string, unknown>;
const u = <T>(v: T | null | undefined) => (v === null ? undefined : v) as T | undefined;

/* ---------------- database row -> app object ---------------- */
const fromProfile = (r: Row): User => ({
  id: r.id as string,
  name: (r.name as string) || (r.email as string),
  email: r.email as string,
  role: r.role as User["role"],
  title: r.title as string,
  teamIds: (r.team_ids as string[]) ?? [],
  clientId: u(r.client_id as string),
  color: r.color as string,
  photo: u(r.photo as string),
  emailAlerts: r.email_alerts !== false,
  emailDigest: r.email_digest !== false,
});
const fromClient = (r: Row): Client => ({
  id: r.id as string,
  name: r.name as string,
  contact: r.contact as string,
  phone: r.phone as string,
  email: r.email as string,
  status: r.status as Client["status"],
  color: r.color as string,
  industry: r.industry as string,
  image: u(r.image as string),
});
const fromBoard = (r: Row, stars: Set<string>): Board => ({
  id: r.id as string,
  name: r.name as string,
  clientId: u(r.client_id as string),
  color: r.color as string,
  memberIds: (r.member_ids as string[]) ?? [],
  starred: stars.has(r.id as string),
  cover: u(r.cover as string),
  description: u(r.description as string),
  startDate: u(r.start_date as string),
  dueDate: u(r.due_date as string),
  status: r.status as Board["status"],
  fields: (r.fields as Board["fields"]) ?? [],
});
const fromList = (r: Row): List => ({ id: r.id as string, boardId: r.board_id as string, name: r.name as string, kind: u(r.kind as List["kind"]) });
const fromCard = (r: Row, comments: Comment[]): Card => ({
  id: r.id as string,
  boardId: r.board_id as string,
  listId: r.list_id as string,
  order: r.position as number,
  title: r.title as string,
  description: r.description as string,
  assigneeIds: (r.assignee_ids as string[]) ?? [],
  teamId: u(r.team_id as string),
  claimedBy: u(r.claimed_by as string),
  assignedBy: (r.assigned_by as string) ?? "",
  due: u(r.due as string),
  priority: r.priority as Card["priority"],
  labels: (r.labels as string[]) ?? [],
  checklist: (r.checklist as Card["checklist"]) ?? [],
  comments,
  clientVisible: r.client_visible as boolean,
  archived: r.archived as boolean,
  createdAt: r.created_at as string,
  history: (r.history as Card["history"]) ?? [],
  attachments: (r.attachments as Card["attachments"]) ?? [],
  cover: u(r.cover as string),
  repeat: u(r.repeat as Card["repeat"]),
  custom: (r.custom as Card["custom"]) ?? {},
});
const fromComment = (r: Row): Comment => ({ id: r.id as string, userId: r.user_id as string, text: r.text as string, internal: r.internal as boolean, at: r.created_at as string });
const fromRequest = (r: Row): ClientRequest => ({
  id: r.id as string,
  clientId: r.client_id as string,
  boardId: r.board_id as string,
  title: r.title as string,
  description: r.description as string,
  priority: r.priority as ClientRequest["priority"],
  wantedBy: u(r.wanted_by as string),
  status: r.status as ClientRequest["status"],
  by: (r.created_by as string) ?? "",
  at: r.created_at as string,
});
const fromNotification = (r: Row): Notification => ({
  id: r.id as string,
  userId: r.user_id as string,
  text: r.text as string,
  at: r.created_at as string,
  read: r.read as boolean,
  href: r.href as string,
  kind: r.kind as Notification["kind"],
});
const fromActivity = (r: Row): Activity => ({ id: r.id as string, at: r.created_at as string, userId: (r.user_id as string) ?? "", text: r.text as string, boardId: u(r.board_id as string) });

/* ---------------- app object -> database row ---------------- */
const n = <T>(v: T | undefined) => (v === undefined || v === "" ? null : v);
const toRow = {
  teams: (t: Team) => ({ id: t.id, name: t.name, color: t.color }),
  labels: (l: Label) => ({ id: l.id, name: l.name, color: l.color }),
  clients: (c: Client) => ({ id: c.id, name: c.name, contact: c.contact, phone: c.phone, email: c.email, status: c.status, color: c.color, industry: c.industry, image: n(c.image) }),
  boards: (b: Board) => ({
    id: b.id,
    name: b.name,
    client_id: n(b.clientId),
    color: b.color,
    member_ids: b.memberIds,
    cover: n(b.cover),
    description: n(b.description),
    start_date: n(b.startDate),
    due_date: n(b.dueDate),
    status: b.status ?? "active",
    fields: b.fields ?? [],
  }),
  lists: (l: List, position: number) => ({ id: l.id, board_id: l.boardId, name: l.name, kind: n(l.kind), position }),
  cards: (c: Card) => ({
    id: c.id,
    board_id: c.boardId,
    list_id: c.listId,
    position: c.order,
    title: c.title,
    description: c.description,
    assignee_ids: c.assigneeIds,
    team_id: n(c.teamId),
    claimed_by: n(c.claimedBy),
    assigned_by: n(c.assignedBy),
    due: n(c.due),
    priority: c.priority,
    labels: c.labels,
    checklist: c.checklist,
    history: c.history,
    attachments: c.attachments,
    client_visible: c.clientVisible,
    archived: !!c.archived,
    cover: n(c.cover),
    repeat: n(c.repeat),
    custom: c.custom ?? {},
  }),
  requests: (r: ClientRequest) => ({ id: r.id, client_id: r.clientId, board_id: r.boardId, title: r.title, description: r.description, priority: r.priority, wanted_by: n(r.wantedBy), status: r.status }),
  notifications: (x: Notification) => ({ id: x.id, user_id: x.userId, text: x.text, href: x.href, kind: x.kind, read: x.read }),
  activity: (a: Activity) => ({ id: a.id, text: a.text, board_id: n(a.boardId) }),
  templates: (t: ProjectTemplate) => ({ id: t.id, name: t.name, blurb: t.blurb, lists: t.lists, cards: t.cards ?? [], fields: t.fields ?? [] }),
  timeEntries: (e: TimeEntry) => ({ id: e.id, card_id: e.cardId, board_id: e.boardId, minutes: e.minutes, note: e.note, spent_on: e.spentOn }),
  profiles: (p: User) => ({ name: p.name, title: p.title, photo: n(p.photo), color: p.color, email_alerts: p.emailAlerts !== false, email_digest: p.emailDigest !== false }),
};

/* ---------------- read ---------------- */
async function all(table: string, order?: string, asc = true) {
  let q = supabase().from(table).select("*");
  if (order) q = q.order(order, { ascending: asc });
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

export async function loadAll(userId: string): Promise<LiveData> {
  const [profiles, teams, clients, boards, stars, lists, cards, comments, labels, requests, notifications, templates, timeEntries, activity] = await Promise.all([
    all("profiles", "created_at"),
    all("teams", "created_at"),
    all("clients", "created_at"),
    all("boards", "created_at"),
    all("board_stars"),
    all("lists", "position"),
    all("cards", "position"),
    all("comments", "created_at"),
    all("labels", "name"),
    all("client_requests", "created_at", false),
    all("notifications", "created_at", false),
    all("project_templates", "created_at"),
    all("time_entries", "spent_on", false),
    supabase()
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (error) throw new Error(`activity: ${error.message}`);
        return (data ?? []) as Row[];
      }),
  ]);
  const starSet = new Set(stars.filter((s) => s.user_id === userId).map((s) => s.board_id as string));
  const byCard = new Map<string, Comment[]>();
  comments.forEach((c) => byCard.set(c.card_id as string, [...(byCard.get(c.card_id as string) ?? []), fromComment(c)]));
  return {
    users: profiles.map(fromProfile),
    teams: teams.map((t) => ({ id: t.id as string, name: t.name as string, color: t.color as string })),
    clients: clients.map(fromClient),
    boards: boards.map((b) => fromBoard(b, starSet)),
    lists: lists.map(fromList),
    cards: cards.map((c) => fromCard(c, byCard.get(c.id as string) ?? [])),
    labels: labels.map((l) => ({ id: l.id as string, name: l.name as string, color: l.color as string })),
    requests: requests.map(fromRequest),
    notifications: notifications.map(fromNotification),
    activity: activity.map(fromActivity),
    templates: templates.map((t) => ({
      id: t.id as string,
      name: t.name as string,
      blurb: (t.blurb as string) || "Saved from a project",
      lists: (t.lists as ProjectTemplate["lists"]) ?? [],
      starter: [],
      cards: (t.cards as ProjectTemplate["cards"]) ?? [],
      fields: (t.fields as ProjectTemplate["fields"]) ?? [],
      saved: true,
      createdBy: u(t.created_by as string),
    })),
    timeEntries: timeEntries.map((e) => ({
      id: e.id as string,
      cardId: e.card_id as string,
      boardId: e.board_id as string,
      userId: e.user_id as string,
      minutes: e.minutes as number,
      note: (e.note as string) ?? "",
      spentOn: e.spent_on as string,
      at: e.created_at as string,
    })),
    currentUserId: userId,
  };
}

/* ---------------- write: only what changed ---------------- */
type Keyed = { id: string };
function changes<T extends Keyed>(before: T[], after: T[], strip?: (x: T) => unknown) {
  const prev = new Map(before.map((x) => [x.id, x]));
  const added: T[] = [];
  const updated: T[] = [];
  const nowIds = new Set(after.map((x) => x.id));
  const removed = before.filter((x) => !nowIds.has(x.id));
  for (const x of after) {
    const p = prev.get(x.id);
    if (!p) added.push(x);
    else if (p !== x && JSON.stringify(strip ? strip(p) : p) !== JSON.stringify(strip ? strip(x) : x)) updated.push(x);
  }
  return { added, updated, removed };
}

async function check<T>(p: PromiseLike<{ error: { message: string } | null; data?: T }>, what: string) {
  const { error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
}

export async function pushChanges(before: LiveData, after: LiveData, role: User["role"]) {
  const sb = supabase();
  const me = after.currentUserId;
  const isStaff = role === "admin" || role === "member";

  // Order matters: parents before children.
  const simple = async <T extends Keyed>(table: string, key: keyof LiveData, map: (x: T) => Row, canUpdate = true) => {
    const { added, updated } = changes(before[key] as unknown as T[], after[key] as unknown as T[]);
    if (added.length) await check(sb.from(table).insert(added.map(map)), `add ${table}`);
    if (canUpdate) for (const x of updated) await check(sb.from(table).update(map(x)).eq("id", x.id), `update ${table}`);
  };

  await simple<Team>("teams", "teams", toRow.teams);
  await simple<Label>("labels", "labels", toRow.labels);
  await simple<Client>("clients", "clients", toRow.clients);

  // profile: only your own name/title/photo; invites go through inviteUser
  const myBefore = before.users.find((x) => x.id === me);
  const myAfter = after.users.find((x) => x.id === me);
  if (myBefore && myAfter && JSON.stringify(toRow.profiles(myBefore)) !== JSON.stringify(toRow.profiles(myAfter))) {
    await check(sb.from("profiles").update(toRow.profiles(myAfter)).eq("id", me), "update profile");
  }

  // boards, with stars kept apart because they are per person
  const b = changes(before.boards, after.boards, ({ starred, ...rest }) => rest);
  if (b.added.length) await check(sb.from("boards").insert(b.added.map((x) => ({ ...toRow.boards(x), created_by: me }))), "add project");
  for (const x of b.updated) await check(sb.from("boards").update(toRow.boards(x)).eq("id", x.id), "update project");
  const starBefore = new Set(before.boards.filter((x) => x.starred).map((x) => x.id));
  for (const x of after.boards) {
    if (x.starred && !starBefore.has(x.id)) await check(sb.from("board_stars").insert({ user_id: me, board_id: x.id }), "star");
    if (!x.starred && starBefore.has(x.id)) await check(sb.from("board_stars").delete().eq("user_id", me).eq("board_id", x.id), "unstar");
  }

  // lists keep their order through a position number
  const pos = (lists: List[], l: List) => lists.filter((x) => x.boardId === l.boardId).indexOf(l);
  const l = changes(before.lists, after.lists);
  if (l.added.length) await check(sb.from("lists").insert(l.added.map((x) => toRow.lists(x, pos(after.lists, x)))), "add list");
  for (const x of l.updated) await check(sb.from("lists").update(toRow.lists(x, pos(after.lists, x))).eq("id", x.id), "update list");

  // cards, comments kept apart (own table, so internal ones can be hidden)
  const c = changes(before.cards, after.cards, ({ comments, ...rest }) => rest);
  if (c.added.length) await check(sb.from("cards").insert(c.added.map(toRow.cards)), "add task");
  if (isStaff) for (const x of c.updated) await check(sb.from("cards").update(toRow.cards(x)).eq("id", x.id), "update task");

  const oldComments = new Set(before.cards.flatMap((x) => x.comments.map((m) => m.id)));
  const newComments = after.cards.flatMap((x) => x.comments.filter((m) => !oldComments.has(m.id)).map((m) => ({ id: m.id, card_id: x.id, board_id: x.boardId, user_id: me, text: m.text, internal: m.internal })));
  if (newComments.length) await check(sb.from("comments").insert(newComments), "add comment");

  await simple<ClientRequest>("client_requests", "requests", toRow.requests, isStaff);

  // notifications: send new ones; only your own can be marked read
  const nt = changes(before.notifications, after.notifications);
  if (nt.added.length) await check(sb.from("notifications").insert(nt.added.map(toRow.notifications)), "notify");
  const mine = nt.updated.filter((x) => x.userId === me);
  const readIds = mine.filter((x) => x.read).map((x) => x.id);
  if (readIds.length) await check(sb.from("notifications").update({ read: true }).in("id", readIds), "mark read");

  const ac = changes(before.activity, after.activity);
  if (ac.added.length) await check(sb.from("activity").insert(ac.added.map(toRow.activity)), "log");

  if (isStaff) {
    const tp = changes(before.templates, after.templates);
    if (tp.added.length) await check(sb.from("project_templates").insert(tp.added.map(toRow.templates)), "save template");
    for (const x of tp.updated) await check(sb.from("project_templates").update(toRow.templates(x)).eq("id", x.id), "update template");
    if (tp.removed.length) await check(sb.from("project_templates").delete().in("id", tp.removed.map((x) => x.id)), "delete template");

    const te = changes(before.timeEntries, after.timeEntries);
    if (te.added.length) await check(sb.from("time_entries").insert(te.added.map(toRow.timeEntries)), "log time");
    if (te.removed.length) await check(sb.from("time_entries").delete().in("id", te.removed.map((x) => x.id)), "remove time");
  }
}

/** Clients approve or send back work through a checked database function, not a direct edit. */
export async function clientReview(cardId: string, approve: boolean) {
  await check(supabase().rpc("client_review", { p_card: cardId, p_approve: approve }), "review");
}

/** Save an invite. When that email signs in, they get this role (or right away if they already have). */
export async function saveInvite(x: Omit<User, "id" | "photo">, invitedBy: string) {
  await check(
    supabase()
      .from("invites")
      .upsert({ email: x.email.trim().toLowerCase(), name: x.name, role: x.role, title: x.title, team_ids: x.teamIds, client_id: x.clientId ?? null, color: x.color, invited_by: invitedBy }),
    "invite",
  );
}

/* ---------------- files ---------------- */
export const fileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

const safeName = (name: string) => name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";

/** Upload a task file into the private bucket at <board>/<card>/<id>-<name>. */
export async function uploadAttachment(boardId: string, cardId: string, file: File): Promise<Attachment> {
  const id = crypto.randomUUID();
  const path = `${boardId}/${cardId}/${id}-${safeName(file.name)}`;
  const { error } = await supabase().storage.from("attachments").upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`upload ${file.name}: ${error.message}`);
  return { id, name: file.name, size: fileSize(file.size), type: file.type || undefined, path };
}

/** Short-lived download link for a private task file (cached for its lifetime). */
const signed = new Map<string, { url: string; until: number }>();
export async function attachmentUrl(path: string): Promise<string> {
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await supabase().storage.from("attachments").createSignedUrl(path, 3600);
  if (error || !data) throw new Error(error?.message ?? "no link");
  signed.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export async function removeAttachment(path: string) {
  const { error } = await supabase().storage.from("attachments").remove([path]);
  if (error) throw new Error(`remove file: ${error.message}`);
}

/** Profile photo into the public "avatars" bucket; returns its public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase().storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`photo: ${error.message}`);
  return supabase().storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
