"use client";

import type { Card } from "@/lib/types";
import { useHelpers } from "@/lib/store";
import { cn } from "@/lib/format";
import { AvatarStack, DueChip, Icon, PriorityPill } from "./ui";

export function CardTile({ card, onOpen, dragging, showBoard, client }: { card: Card; onOpen?: () => void; dragging?: boolean; showBoard?: boolean; client?: boolean }) {
  const { userById, labelById, teamById, isDone, boardById } = useHelpers();
  const done = isDone(card);
  const checks = card.checklist.length;
  const checked = card.checklist.filter((c) => c.done).length;
  const team = teamById(card.teamId);
  const comments = client ? card.comments.filter((c) => !c.internal).length : card.comments.length;
  const waitingClaim = team && !card.claimedBy;

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-xl border border-line bg-surface p-3 text-left transition-shadow hover:border-line-strong hover:shadow-[0_6px_16px_-8px_rgba(29,28,26,.25)]",
        dragging && "rotate-[1.5deg] shadow-[0_18px_40px_-12px_rgba(29,28,26,.4)]",
      )}
    >
      {card.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.cover} alt="" draggable={false} className="-mx-3 -mt-3 mb-3 block aspect-[2/1] w-[calc(100%+1.5rem)] max-w-none rounded-t-xl object-cover" />
      )}
      {showBoard && <p className="mb-1.5 truncate text-[11px] font-medium text-faint">{boardById(card.boardId)?.name}</p>}
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.map((l) => {
            const lab = labelById(l);
            return lab ? <span key={l} title={lab.name} className="h-1.5 w-8 rounded-full" style={{ background: lab.color }} /> : null;
          })}
        </div>
      )}
      <p className={cn("text-sm leading-snug font-medium text-ink", done && "text-muted")}>{card.title}</p>

      {waitingClaim && !client && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-high-soft px-2 py-0.5 text-[11px] font-semibold text-high">
          <Icon name="team" size={13} /> {team.name} · waiting to be claimed
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {card.priority !== "medium" && card.priority !== "low" && !done && <PriorityPill p={card.priority} compact />}
        <DueChip due={card.due} done={done} compact />
        {checks > 0 && (
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", checked === checks ? "text-ok" : "text-muted")}>
            <Icon name="list" size={13} /> {checked}/{checks}
          </span>
        )}
        {comments > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
            <Icon name="chat" size={13} /> {comments}
          </span>
        )}
        {card.repeat && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted" title={`Repeats ${card.repeat}`}>
            <Icon name="repeat" size={13} />
          </span>
        )}
        {card.attachments.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
            <Icon name="clip" size={13} /> {card.attachments.length}
          </span>
        )}
        {!card.clientVisible && !client && (
          <span title="Internal only: hidden from client" className="inline-flex items-center text-faint">
            <Icon name="lock" size={13} />
          </span>
        )}
        <span className="ml-auto">
          <AvatarStack users={card.assigneeIds.map(userById)} size={22} />
        </span>
      </div>
    </div>
  );
}
