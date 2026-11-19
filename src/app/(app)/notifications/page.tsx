"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Notification } from "@/lib/types";
import { cn, timeAgo } from "@/lib/format";
import { Button, Empty, Icon, PageHeader } from "@/components/ui";

const KIND: Record<Notification["kind"], { icon: string; tone: string; label: string }> = {
  assigned: { icon: "me", tone: "bg-brand-soft text-brand", label: "Assigned" },
  mention: { icon: "chat", tone: "bg-medium-soft text-medium", label: "Mention" },
  comment: { icon: "chat", tone: "bg-sunken text-ink-soft", label: "Comment" },
  due: { icon: "clock", tone: "bg-high-soft text-high", label: "Due" },
  overdue: { icon: "clock", tone: "bg-urgent-soft text-urgent", label: "Overdue" },
  approval: { icon: "check", tone: "bg-ok-soft text-ok", label: "Approval" },
  request: { icon: "inbox", tone: "bg-high-soft text-high", label: "Request" },
  team: { icon: "team", tone: "bg-sunken text-ink-soft", label: "Team" },
};

export default function NotificationsPage() {
  const s = useStore();
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const mine = s.notifications.filter((n) => n.userId === s.me.id && (!unreadOnly || !n.read));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" sub="Assignments, mentions, approvals and deadlines.">
        <Button variant="outline" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
          {unreadOnly ? "Show all" : "Unread only"}
        </Button>
        <Button variant="ghost" size="sm" onClick={s.markAllRead}>
          Mark all read
        </Button>
      </PageHeader>
      {mine.length === 0 ? (
        <Empty title="You're all caught up" />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {mine.map((n, i) => {
            const k = KIND[n.kind];
            return (
              <li key={n.id} className={cn(i > 0 && "border-t border-line")}>
                <button
                  onClick={() => {
                    s.markRead(n.id);
                    router.push(n.href);
                  }}
                  className={cn("flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-canvas/60", !n.read && "bg-brand-soft/25")}
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", k.tone)}>
                    <Icon name={k.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", n.read ? "text-ink-soft" : "font-medium text-ink")}>{n.text}</span>
                    <span className="text-xs text-faint">
                      {k.label} · {timeAgo(n.at)}
                    </span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
