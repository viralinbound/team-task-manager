"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { parseTrello, type TrelloImport } from "@/lib/trello";
import { cn } from "@/lib/format";
import { Avatar, Button, Field, Icon, inputCls, Modal } from "./ui";

/** Upload a Trello board export (JSON), preview it, and create a Workboard project from it. */
export function ImportTrello({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const [data, setData] = useState<TrelloImport | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [members, setMembers] = useState<string[]>([s.me.id]);
  const staff = s.users.filter((u) => u.role === "admin" || u.role === "member");

  const read = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (f.size > 25 * 1024 * 1024) return setError("That file is over 25 MB. Export a single board, not the whole workspace.");
    try {
      const parsed = parseTrello(await f.text());
      setData(parsed);
      setName(parsed.name);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const go = () => {
    if (!data || !name.trim()) return;
    const id = s.importTrello(data, { name: name.trim(), clientId: clientId || undefined, memberIds: Array.from(new Set([...members, s.me.id])) });
    onClose();
    router.push(`/boards/${id}`);
  };

  const subs = data?.cards.reduce((n, c) => n + c.checklist.length, 0) ?? 0;
  const comments = data?.cards.reduce((n, c) => n + c.comments.length, 0) ?? 0;

  return (
    <Modal open onClose={onClose} label="Import from Trello" width="max-w-2xl">
      <div className="border-b border-line px-6 pt-6 pb-4">
        <h2 className="font-display text-2xl font-semibold">Import from Trello</h2>
        <p className="mt-1 text-sm text-muted">
          In Trello, open the board → <b>menu (⋯)</b> → <b>Print, export and share</b> → <b>Export as JSON</b>, save the file, then choose it here.
        </p>
      </div>

      <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
        <label className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center", data ? "border-ok bg-ok-soft/40" : "border-line-strong hover:border-brand")}>
          <Icon name={data ? "check" : "download"} className={data ? "text-ok" : "text-faint"} />
          <span className="mt-2 text-sm font-medium">{data ? `Loaded “${data.name}”. Choose another file` : "Choose the Trello .json file"}</span>
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => read(e.target.files?.[0])} />
        </label>
        {error && <p className="rounded-lg bg-urgent-soft px-3 py-2 text-sm text-urgent">{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [data.lists.length, "lists"],
                [data.cards.length, "cards"],
                [subs, "checklist items"],
                [comments, "comments"],
              ].map(([n, l]) => (
                <div key={l as string} className="rounded-xl bg-canvas px-3 py-2.5 text-center">
                  <p className="font-display text-2xl font-semibold">{n}</p>
                  <p className="text-[11px] text-muted">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {data.lists.map((l, i) => (
                <span key={i} className={cn("rounded-md px-2 py-0.5 font-medium", l.kind === "done" ? "bg-ok-soft text-ok" : "bg-sunken text-ink-soft")}>
                  {l.name} · {data.cards.filter((c) => c.list === i).length}
                </span>
              ))}
              {!data.lists.some((l) => l.kind === "done") && <span className="rounded-md bg-ok-soft px-2 py-0.5 font-medium text-ok">+ Done (added)</span>}
            </div>
            <ul className="space-y-1 text-xs text-muted">
              <li>• Cards come in unassigned and hidden from the client. Assign people and share cards after import.</li>
              <li>• Checklists become subtasks; labels and due dates carry over; Trello comments become internal comments.</li>
              <li>• Trello file attachments come in as links in the card description.</li>
              {(data.skipped.archivedCards > 0 || data.skipped.archivedLists > 0) && (
                <li>
                  • Skipping archived items: {data.skipped.archivedCards} card{data.skipped.archivedCards === 1 ? "" : "s"}, {data.skipped.archivedLists} list{data.skipped.archivedLists === 1 ? "" : "s"}.
                </li>
              )}
            </ul>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Client">
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                  <option value="">Internal project</option>
                  {s.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink-soft">Team on this project</p>
              <div className="flex flex-wrap gap-2">
                {staff.map((u) => {
                  const on = members.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => setMembers((m) => (on ? m.filter((x) => x !== u.id) : [...m, u.id]))}
                      disabled={u.id === s.me.id}
                      className={cn("flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium", on ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-ink-soft hover:border-line-strong")}
                    >
                      <Avatar user={u} size={22} /> {u.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={go} disabled={!data || !name.trim()}>
          Import {data ? `${data.cards.length} cards` : ""}
        </Button>
      </div>
    </Modal>
  );
}
