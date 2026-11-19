"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/format";
import { Avatar, Icon } from "./ui";
import { useNewProject } from "./NewProject";

const staffNav = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/my", label: "My tasks", icon: "me" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/search", label: "Search", icon: "search" },
];
const adminNav = [
  { href: "/admin", label: "Admin dashboard", icon: "chart" },
  { href: "/clients", label: "Clients", icon: "briefcase" },
  { href: "/team", label: "Team & people", icon: "team" },
];
const clientNav = [
  { href: "/portal", label: "My projects", icon: "home" },
  { href: "/portal/request", label: "New request", icon: "plus" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const { visibleBoards, clientById } = useHelpers();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const newProject = useNewProject();
  const isClient = s.me.role === "client";
  const unread = s.notifications.filter((n) => n.userId === s.me.id && !n.read).length;

  // Route guard for the prototype: clients stay inside the portal, staff stay out of it.
  useEffect(() => {
    if (!s.hydrated) return;
    const shared = path.startsWith("/notifications") || path.startsWith("/settings");
    if (isClient && !path.startsWith("/portal") && !shared) router.replace("/portal");
    if (!isClient && path.startsWith("/portal")) router.replace("/");
    if (s.me.role !== "admin" && ["/admin", "/clients", "/team"].some((p) => path.startsWith(p))) router.replace("/");
  }, [path, isClient, s.me.role, s.hydrated, router]);

  useEffect(() => setOpen(false), [path]);

  const active = (href: string) => (href === "/" || href === "/portal" ? path === href : path.startsWith(href));

  const NavLink = ({ href, label, icon, badge }: { href: string; label: string; icon: string; badge?: number }) => (
    <Link
      href={href}
      className={cn(
        "focus-ring group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active(href) ? "bg-surface text-ink shadow-[0_1px_0_rgba(0,0,0,.04),0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:bg-sunken hover:text-ink",
      )}
    >
      <Icon name={icon} className={active(href) ? "text-brand" : "text-faint group-hover:text-muted"} />
      <span className="flex-1">{label}</span>
      {!!badge && <span className="rounded-full bg-brand px-1.5 py-px text-[10px] font-bold text-white">{badge}</span>}
    </Link>
  );

  const client = clientById(s.me.clientId);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <Link href={isClient ? "/portal" : "/"} className="px-3">
        <span className="font-display text-xl font-semibold tracking-tight">Workboard</span>
      </Link>

      {isClient && client && (
        <div className="mx-1 flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {client.image && <img src={client.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">Client portal</p>
            <p className="truncate text-sm font-semibold">{client.name}</p>
          </div>
        </div>
      )}

      <nav className="flex flex-col gap-0.5">
        {(isClient ? clientNav : staffNav).map((n) => (
          <NavLink key={n.href} {...n} badge={n.href === "/notifications" ? unread : undefined} />
        ))}
      </nav>

      {s.me.role === "admin" && (
        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-faint uppercase">Admin</p>
          <nav className="flex flex-col gap-0.5">
            {adminNav.map((n) => (
              <NavLink key={n.href} {...n} />
            ))}
          </nav>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mb-1.5 flex items-center justify-between pr-1.5 pl-3">
          <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">{isClient ? "Your projects" : "Projects"}</p>
          {!isClient && s.me.role !== "viewer" && (
            <button onClick={() => newProject()} className="focus-ring grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-sunken hover:text-brand" aria-label="New project" title="New project">
              <Icon name="plus" size={15} />
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-0.5">
          {visibleBoards.map((b) => {
            const href = isClient ? `/portal/boards/${b.id}` : `/boards/${b.id}`;
            return (
              <Link
                key={b.id}
                href={href}
                className={cn("focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm", path === href ? "bg-sunken font-semibold text-ink" : "text-ink-soft hover:bg-sunken")}
              >
                {b.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.cover} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: b.color }} />
                )}
                <span className="truncate">{b.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
        <Avatar user={s.me} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{s.me.name}</p>
          <p className="truncate text-xs text-muted">{s.me.title}</p>
        </div>
        <Link href="/settings" className="focus-ring rounded-md p-1.5 text-faint hover:bg-sunken hover:text-ink" aria-label="Settings">
          <Icon name="settings" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-canvas lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/30" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-canvas shadow-xl" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6">
        <button className="focus-ring -ml-1 rounded-md p-1.5 text-ink-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        {!isClient ? (
          <form
            className="relative hidden max-w-md flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(`/search?q=${encodeURIComponent(String(q ?? ""))}`);
            }}
          >
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" size={16} />
            <input name="q" placeholder="Search tasks, projects, people…" className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm outline-none placeholder:text-faint focus:border-brand" />
          </form>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex-1 sm:hidden" />
        <ViewAs />
        <Bell />
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

/** Prototype-only control: switch the signed-in person to see each role's screens. */
function ViewAs() {
  const s = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const picks = [s.users.find((u) => u.role === "admin"), s.users.find((u) => u.id === "u-priya"), s.users.find((u) => u.id === "u-arjun"), s.users.find((u) => u.role === "client")].filter(Boolean);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="focus-ring flex h-9 items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-2.5 text-xs font-semibold text-ink-soft hover:border-brand">
        <Icon name="eye" size={15} className="text-brand" />
        <span className="hidden sm:inline">View as</span>
        <span className="rounded bg-sunken px-1.5 py-0.5 capitalize">{s.me.role}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          <p className="px-2.5 pt-1.5 pb-2 text-[11px] text-muted">Prototype only: switch person to preview each role.</p>
          {picks.map((u) => (
            <button
              key={u!.id}
              onClick={() => {
                s.switchUser(u!.id);
                setOpen(false);
                router.push(u!.role === "client" ? "/portal" : "/");
              }}
              className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sunken", s.me.id === u!.id && "bg-sunken")}
            >
              <Avatar user={u} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{u!.name}</span>
                <span className="block truncate text-xs text-muted capitalize">
                  {u!.role} · {u!.title}
                </span>
              </span>
              {s.me.id === u!.id && <Icon name="check" className="text-brand" size={16} />}
            </button>
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <button onClick={() => s.resetDemo()} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-muted hover:bg-sunken">
              Reset demo data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bell() {
  const s = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const mine = s.notifications.filter((n) => n.userId === s.me.id);
  const unread = mine.filter((n) => !n.read).length;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="focus-ring relative grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-sunken" aria-label="Notifications">
        <Icon name="bell" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-urgent ring-2 ring-canvas" />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button onClick={s.markAllRead} className="text-xs font-semibold text-brand hover:underline">
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {mine.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</li>}
            {mine.slice(0, 8).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    s.markRead(n.id);
                    setOpen(false);
                    router.push(n.href);
                  }}
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-canvas"
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                  <span>
                    <span className={cn("block text-sm", n.read ? "text-muted" : "text-ink")}>{n.text}</span>
                    <span className="text-xs text-faint">{timeAgo(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-ink-soft hover:bg-canvas">
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
