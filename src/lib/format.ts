import type { Priority } from "./types";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days from today to an ISO date (negative = past). */
export const daysUntil = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((startOfDay(new Date(y, m - 1, d)) - startOfDay(new Date())) / 86_400_000);
};

export type DueState = "overdue" | "today" | "soon" | "later" | "none";

export const dueState = (iso?: string, done?: boolean): DueState => {
  if (!iso || done) return "none";
  const n = daysUntil(iso);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  if (n <= 3) return "soon";
  return "later";
};

export const dueLabel = (iso?: string) => {
  if (!iso) return "No date";
  const n = daysUntil(iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days overdue`;
  if (n < 7) return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
};

export const PRIORITY: Record<Priority, { label: string; text: string; bg: string; dot: string; rank: number }> = {
  urgent: { label: "Urgent", text: "text-urgent", bg: "bg-urgent-soft", dot: "bg-urgent", rank: 0 },
  high: { label: "High", text: "text-high", bg: "bg-high-soft", dot: "bg-high", rank: 1 },
  medium: { label: "Medium", text: "text-medium", bg: "bg-medium-soft", dot: "bg-medium", rank: 2 },
  low: { label: "Low", text: "text-low", bg: "bg-low-soft", dot: "bg-low", rank: 3 },
};

export const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
