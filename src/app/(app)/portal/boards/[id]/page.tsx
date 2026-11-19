"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useHelpers, useStore } from "@/lib/store";
import { Kanban } from "@/components/Kanban";
import { CardModal } from "@/components/CardModal";
import { Button, Empty, Icon } from "@/components/ui";

export default function PortalBoard() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const { boardById } = useHelpers();
  const router = useRouter();
  const path = usePathname();
  const openId = useSearchParams().get("card");
  const board = boardById(id);

  // A client can only open their own client's boards: anything else looks like it doesn't exist.
  if (!board || board.clientId !== s.me.clientId) {
    return (
      <Empty title="Not found" sub="This project doesn't exist or isn't shared with you.">
        <Link href="/portal" className="text-sm font-semibold text-brand">
          Back to my projects
        </Link>
      </Empty>
    );
  }
  const open = (cid: string | null) => router.replace(cid ? `${path}?card=${cid}` : path, { scroll: false });

  return (
    <div className="-mt-2">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <span className="h-9 w-1.5 rounded-full" style={{ background: board.color }} />
        <div className="flex-1">
          <p className="text-xs font-medium text-muted">Project</p>
          <h1 className="font-display text-2xl font-semibold">{board.name}</h1>
        </div>
        <Link href="/portal/request">
          <Button variant="outline">
            <Icon name="plus" size={16} /> New request
          </Button>
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted">You can see progress, comment, and approve items in the Client Approval column.</p>
      <Kanban boardId={board.id} onOpen={open} client />
      <CardModal cardId={openId} onClose={() => open(null)} client />
    </div>
  );
}
