import type { List } from "./types";

type ListSpec = { name: string; kind?: List["kind"] };

export interface ProjectTemplate {
  id: string;
  name: string;
  blurb: string;
  lists: ListSpec[];
  /** starter cards: [list index, title] */
  starter: [number, string][];
}

const clientFlow: ListSpec[] = [
  { name: "Requests", kind: "requests" },
  { name: "To Do" },
  { name: "In Progress" },
  { name: "Internal Review" },
  { name: "Client Approval", kind: "approval" },
  { name: "Done", kind: "done" },
];

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    blurb: "To Do, In Progress, Done. Add your own lists.",
    lists: [{ name: "To Do" }, { name: "In Progress" }, { name: "Done", kind: "done" }],
    starter: [],
  },
  {
    id: "client",
    name: "Client project",
    blurb: "Requests in, internal review, client approval, done.",
    lists: clientFlow,
    starter: [],
  },
  {
    id: "website",
    name: "Website build",
    blurb: "Client flow plus the usual website tasks to start from.",
    lists: clientFlow,
    starter: [
      [1, "Sitemap and page list"],
      [1, "Collect content and photos from client"],
      [1, "Homepage design"],
      [1, "Inner page designs"],
      [1, "Development and hosting setup"],
      [1, "Contact form and WhatsApp alert"],
      [1, "SEO basics: titles, meta, sitemap"],
      [1, "Launch checklist"],
    ],
  },
  {
    id: "social",
    name: "Social media month",
    blurb: "Plan, create, approve and post a month of content.",
    lists: [{ name: "Ideas", kind: "requests" }, { name: "Writing" }, { name: "Design" }, { name: "Client Approval", kind: "approval" }, { name: "Scheduled" }, { name: "Posted", kind: "done" }],
    starter: [
      [0, "Content calendar for the month"],
      [0, "Reel scripts – week 1"],
      [0, "Carousel posts – week 1"],
      [0, "Monthly performance report"],
    ],
  },
  {
    id: "ads",
    name: "Ads campaign",
    blurb: "Research, build, launch and optimise a paid campaign.",
    lists: [{ name: "Research" }, { name: "Build" }, { name: "Client Approval", kind: "approval" }, { name: "Live" }, { name: "Done", kind: "done" }],
    starter: [
      [0, "Keyword and audience research"],
      [1, "Ad copy and creatives"],
      [1, "Landing page"],
      [1, "Conversion tracking"],
      [3, "Weekly optimisation"],
    ],
  },
];

export const COVER_CHOICES = ["office", "studio", "city", "nature", "ocean", "desk", "mountain", "abstract"].map((s) => `https://picsum.photos/seed/cover-${s}/640/260`);
