/**
 * Reads a Trello board export (Board menu → Print, export and share → Export as JSON)
 * into a plain shape the store can turn into a Workboard project.
 * People are not mapped (Trello members aren't Workboard users); cards come in unassigned.
 */
import type { Priority } from "./types";

export interface TrelloImport {
  name: string;
  description: string;
  lists: { name: string; kind?: "done" }[];
  labels: { name: string; color: string }[];
  cards: {
    list: number;
    title: string;
    description: string;
    due?: string;
    labels: string[]; // label names
    checklist: { text: string; done: boolean }[];
    comments: { author: string; text: string; at: string }[];
    priority: Priority;
  }[];
  skipped: { archivedCards: number; archivedLists: number };
}

const COLORS: Record<string, string> = {
  green: "#2f7d4f",
  yellow: "#b7791f",
  orange: "#c2410c",
  red: "#b42318",
  purple: "#6d5bd0",
  blue: "#3f6db3",
  sky: "#2b7a9a",
  lime: "#5f8a1f",
  pink: "#b4537a",
  black: "#3d3a35",
};
const colorOf = (c?: string | null) => COLORS[(c ?? "").replace(/_(light|dark)$/, "")] ?? "#6d5bd0";

type Any = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as Any[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function parseTrello(raw: string): TrelloImport {
  let j: Any;
  try {
    j = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON. In Trello use: board menu → Print, export and share → Export as JSON.");
  }
  if (!Array.isArray(j.lists) || !Array.isArray(j.cards)) throw new Error("This doesn't look like a Trello board export (no lists or cards found).");

  const allLists = arr(j.lists).sort((a, b) => Number(a.pos) - Number(b.pos));
  const lists = allLists.filter((l) => !l.closed);
  const listIndex = new Map(lists.map((l, i) => [str(l.id), i]));

  const labelsById = new Map(arr(j.labels).map((l) => [str(l.id), { name: str(l.name) || `${str(l.color) || "unnamed"} label`, color: colorOf(str(l.color)) }]));
  const usedLabels = new Map<string, { name: string; color: string }>();

  const checklists = new Map<string, Any[]>();
  arr(j.checklists).forEach((c) => checklists.set(str(c.idCard), [...(checklists.get(str(c.idCard)) ?? []), c]));

  const comments = new Map<string, { author: string; text: string; at: string }[]>();
  arr(j.actions)
    .filter((a) => a.type === "commentCard")
    .forEach((a) => {
      const data = (a.data ?? {}) as Any;
      const cardId = str(((data.card ?? {}) as Any).id);
      const who = str(((a.memberCreator ?? {}) as Any).fullName) || "Trello user";
      comments.set(cardId, [{ author: who, text: str(data.text), at: str(a.date) }, ...(comments.get(cardId) ?? [])]);
    });

  const allCards = arr(j.cards);
  const cards = allCards
    .filter((c) => !c.closed && listIndex.has(str(c.idList)))
    .sort((a, b) => Number(a.pos) - Number(b.pos))
    .map((c) => {
      const labelNames = arr(c.idLabels as unknown)
        .map((id) => labelsById.get(String(id)))
        .filter(Boolean)
        .map((l) => {
          usedLabels.set(l!.name.toLowerCase(), l!);
          return l!.name;
        });
      // Trello card labels sometimes arrive as objects
      arr(c.labels).forEach((l) => {
        const lab = { name: str(l.name) || `${str(l.color)} label`, color: colorOf(str(l.color)) };
        if (!labelNames.includes(lab.name)) {
          labelNames.push(lab.name);
          usedLabels.set(lab.name.toLowerCase(), lab);
        }
      });
      const items = (checklists.get(str(c.id)) ?? [])
        .flatMap((cl) => arr(cl.checkItems).sort((a, b) => Number(a.pos) - Number(b.pos)))
        .map((i) => ({ text: str(i.name).slice(0, 500), done: i.state === "complete" }));
      const links = arr(c.attachments)
        .filter((a) => str(a.url))
        .map((a) => `- ${str(a.name) || "Attachment"}: ${str(a.url)}`);
      const desc = [str(c.desc), links.length ? `Attachments from Trello:\n${links.join("\n")}` : ""].filter(Boolean).join("\n\n");
      const lower = labelNames.map((n) => n.toLowerCase());
      const priority: Priority = lower.some((n) => /urgent|critical|blocker/.test(n)) ? "urgent" : lower.some((n) => /high|important/.test(n)) ? "high" : lower.some((n) => /low/.test(n)) ? "low" : "medium";
      return {
        list: listIndex.get(str(c.idList))!,
        title: str(c.name).slice(0, 300) || "Untitled card",
        description: desc.slice(0, 20000),
        due: str(c.due) ? str(c.due).slice(0, 10) : undefined,
        labels: labelNames,
        checklist: items,
        comments: comments.get(str(c.id)) ?? [],
        priority,
      };
    });

  // A list called Done / Complete / Finished becomes the project's Done column.
  const doneIdx = [...lists.keys()].reverse().find((i) => /^(done|complete[d]?|finished|shipped|live)\b/i.test(str(lists[i].name).trim()));

  return {
    name: str(j.name) || "Imported board",
    description: str(j.desc),
    lists: lists.map((l, i) => ({ name: str(l.name) || "Untitled list", ...(i === doneIdx ? { kind: "done" as const } : {}) })),
    labels: [...usedLabels.values()],
    cards,
    skipped: { archivedCards: allCards.length - allCards.filter((c) => !c.closed).length, archivedLists: allLists.length - lists.length },
  };
}
