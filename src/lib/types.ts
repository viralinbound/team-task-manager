export type Role = "admin" | "member" | "client" | "viewer";
export type Priority = "urgent" | "high" | "medium" | "low";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  teamIds: string[];
  clientId?: string;
  color: string;
  photo?: string;
  /** Live only: instant emails for assignments, mentions, approvals, requests. */
  emailAlerts?: boolean;
  /** Live only: the 9 am daily digest. */
  emailDigest?: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  status: "active" | "paused" | "completed";
  color: string;
  industry: string;
  image?: string;
}

export interface Board {
  id: string;
  name: string;
  clientId?: string;
  color: string;
  memberIds: string[];
  starred?: boolean;
  cover?: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  status?: "active" | "on-hold" | "completed";
  /** Custom fields this project adds to every task. */
  fields?: FieldDef[];
}

export interface List {
  id: string;
  boardId: string;
  name: string;
  kind?: "requests" | "approval" | "done";
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  /** Subtask owner (optional). */
  assigneeId?: string;
  /** Subtask due date, YYYY-MM-DD (optional). */
  due?: string;
}

export type Repeat = "daily" | "weekly" | "monthly";

/** A project's own extra field, e.g. "Budget", "Platform", "Go-live date". */
export type FieldType = "text" | "number" | "date" | "select" | "checkbox";
export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  /** choices for "select" */
  options?: string[];
}
export type FieldValue = string | number | boolean;

/** Time someone spent on a task (internal; never shown to clients). */
export interface TimeEntry {
  id: string;
  cardId: string;
  boardId: string;
  userId: string;
  minutes: number;
  note: string;
  /** YYYY-MM-DD */
  spentOn: string;
  at: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  internal: boolean;
  at: string;
}

export interface HistoryItem {
  at: string;
  userId: string;
  text: string;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  order: number;
  title: string;
  description: string;
  assigneeIds: string[];
  teamId?: string;
  claimedBy?: string;
  assignedBy: string;
  due?: string;
  priority: Priority;
  labels: string[];
  checklist: ChecklistItem[];
  comments: Comment[];
  clientVisible: boolean;
  archived?: boolean;
  createdAt: string;
  history: HistoryItem[];
  attachments: Attachment[];
  cover?: string;
  /** Re-create this task with the next due date when it is marked done. */
  repeat?: Repeat;
  /** Custom field values keyed by FieldDef.id. */
  custom?: Record<string, FieldValue>;
}

/** A file on a task. Live: `path` points into the private "attachments" bucket. Demo: `url` is a local preview. */
export interface Attachment {
  id: string;
  name: string;
  size: string;
  type?: string;
  path?: string;
  url?: string;
  thumb?: string;
}

export interface ClientRequest {
  id: string;
  clientId: string;
  boardId: string;
  title: string;
  description: string;
  priority: Priority;
  wantedBy?: string;
  status: "new" | "accepted" | "declined";
  by: string;
  at: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  at: string;
  read: boolean;
  href: string;
  kind: "assigned" | "mention" | "comment" | "due" | "overdue" | "approval" | "request" | "team";
}

export interface Activity {
  id: string;
  at: string;
  userId: string;
  text: string;
  boardId?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}
