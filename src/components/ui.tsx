"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Check,
  CheckSquare,
  Clock,
  Download,
  Eye,
  Flag,
  House,
  Inbox,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  User as UserIcon,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Priority, User } from "@/lib/types";
import { cn, dueLabel, dueState, initials, PRIORITY } from "@/lib/format";

/* ---------- Icons: Lucide, mapped to the short names the screens use ---------- */
const ICONS: Record<string, LucideIcon> = {
  home: House,
  me: UserIcon,
  chart: BarChart3,
  users: Users,
  briefcase: Briefcase,
  bell: Bell,
  search: Search,
  settings: Settings,
  plus: Plus,
  x: X,
  check: Check,
  star: Star,
  clock: Clock,
  chat: MessageSquare,
  clip: Paperclip,
  list: ListChecks,
  lock: Lock,
  eye: Eye,
  arrow: ArrowRight,
  back: ArrowLeft,
  inbox: Inbox,
  logout: LogOut,
  archive: Archive,
  flag: Flag,
  team: UsersRound,
  download: Download,
  menu: Menu,
  sparkle: Sparkles,
  task: CheckSquare,
};

export function Icon({ name, className, size = 18, fill }: { name: string; className?: string; size?: number; fill?: boolean }) {
  const C = ICONS[name] ?? Sparkles;
  return <C size={size} strokeWidth={1.75} className={className} fill={fill ? "currentColor" : "none"} aria-hidden />;
}

/* ---------- People: photo avatar, initials while loading or if the photo fails ---------- */
export function Avatar({ user, size = 28, ring }: { user?: User; size?: number; ring?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!user) return null;
  const showPhoto = user.photo && !failed;
  return (
    <span
      title={user.name}
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none", ring && "ring-2 ring-surface")}
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.38 }}
    >
      {initials(user.name)}
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photo} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </span>
  );
}


export function AvatarStack({ users, size = 24, max = 3 }: { users: (User | undefined)[]; size?: number; max?: number }) {
  const list = users.filter(Boolean) as User[];
  return (
    <span className="flex -space-x-1.5">
      {list.slice(0, max).map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {list.length > max && (
        <span className="inline-flex items-center justify-center rounded-full bg-sunken text-[10px] font-semibold text-muted ring-2 ring-surface" style={{ width: size, height: size }}>
          +{list.length - max}
        </span>
      )}
    </span>
  );
}

/* ---------- Chips ---------- */
export function PriorityPill({ p, compact }: { p: Priority; compact?: boolean }) {
  const s = PRIORITY[p];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", s.bg, s.text, compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function DueChip({ due, done, compact }: { due?: string; done?: boolean; compact?: boolean }) {
  if (!due) return null;
  const st = dueState(due, done);
  const tone =
    done ? "bg-ok-soft text-ok" : st === "overdue" ? "bg-urgent-soft text-urgent" : st === "today" ? "bg-high-soft text-high" : st === "soon" ? "bg-sunken text-ink-soft" : "text-muted";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md font-medium", tone, compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs")}>
      <Icon name={done ? "check" : "clock"} size={compact ? 12 : 14} />
      {done ? "Done" : dueLabel(due)}
    </span>
  );
}

export function Chip({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-soft", className)}>
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

/* ---------- Controls ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-brand text-white hover:bg-brand-strong",
        variant === "outline" && "border border-line bg-surface text-ink hover:border-line-strong hover:bg-canvas",
        variant === "ghost" && "text-ink-soft hover:bg-sunken",
        variant === "danger" && "bg-urgent text-white hover:opacity-90",
        className,
      )}
    />
  );
}

export const inputCls =
  "focus-ring w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-brand";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, children, width = "max-w-3xl", label }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-3 pt-[6vh] sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal aria-label={label} className={cn("w-full rounded-2xl bg-surface shadow-[0_30px_80px_-20px_rgba(29,28,26,.45)]", width)}>
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 shrink-0 overflow-hidden rounded-full bg-sunken", /(^|\s)w-/.test(className ?? "") ? "" : "w-full", className)}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, sub }: { eyebrow?: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wide text-brand uppercase">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {sub && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{sub}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
