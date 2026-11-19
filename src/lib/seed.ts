import type {
  Activity,
  Board,
  Card,
  Client,
  ClientRequest,
  Label,
  List,
  Notification,
  Team,
  User,
} from "./types";

/** Date helpers: all demo dates are relative to "now", so the demo always looks current. */
const DAY = 86_400_000;
export const daysFromNow = (n: number) => {
  const d = new Date(Date.now() + n * DAY);
  return d.toISOString().slice(0, 10);
};
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const teams: Team[] = [
  { id: "t-design", name: "Design", color: "#b4537a" },
  { id: "t-dev", name: "Development", color: "#3f6db3" },
  { id: "t-mkt", name: "Marketing", color: "#b7791f" },
  { id: "t-sales", name: "Sales", color: "#2f7d4f" },
];

export const clients: Client[] = [
  { id: "c-sharma", name: "Sharma Interiors", contact: "Rohit Sharma", phone: "+91 98100 11223", email: "rohit@sharmainteriors.example", status: "active", color: "#8a5a3b", industry: "Interior design" },
  { id: "c-green", name: "GreenLeaf Organics", contact: "Meera Iyer", phone: "+91 98450 77881", email: "meera@greenleaf.example", status: "active", color: "#2f7d4f", industry: "Organic food" },
  { id: "c-apex", name: "Apex Motors", contact: "Vikram Singh", phone: "+91 99880 44556", email: "vikram@apexmotors.example", status: "active", color: "#3f6db3", industry: "Automobile dealer" },
  { id: "c-lotus", name: "Lotus Dental Care", contact: "Dr. Anjali Rao", phone: "+91 97400 33219", email: "anjali@lotusdental.example", status: "paused", color: "#b4537a", industry: "Healthcare" },
];

export const users: User[] = [
  { id: "u-admin", name: "Aarav Mehta", email: "aarav@agency.example", role: "admin", title: "Founder", teamIds: [], color: "#1f6f5c" },
  { id: "u-priya", name: "Priya Nair", email: "priya@agency.example", role: "member", title: "Lead Designer", teamIds: ["t-design"], color: "#b4537a" },
  { id: "u-kabir", name: "Kabir Khan", email: "kabir@agency.example", role: "member", title: "UI Designer", teamIds: ["t-design"], color: "#9a4f8c" },
  { id: "u-rahul", name: "Rahul Verma", email: "rahul@agency.example", role: "member", title: "Full-stack Developer", teamIds: ["t-dev"], color: "#3f6db3" },
  { id: "u-sneha", name: "Sneha Patel", email: "sneha@agency.example", role: "member", title: "Frontend Developer", teamIds: ["t-dev"], color: "#2b7a9a" },
  { id: "u-arjun", name: "Arjun Das", email: "arjun@agency.example", role: "member", title: "Performance Marketer", teamIds: ["t-mkt"], color: "#b7791f" },
  { id: "u-isha", name: "Isha Gupta", email: "isha@agency.example", role: "member", title: "Content Writer", teamIds: ["t-mkt"], color: "#c2410c" },
  { id: "u-dev", name: "Dev Malhotra", email: "dev@agency.example", role: "member", title: "Account Manager", teamIds: ["t-sales"], color: "#2f7d4f" },
  { id: "u-client", name: "Rohit Sharma", email: "rohit@sharmainteriors.example", role: "client", title: "Owner, Sharma Interiors", teamIds: [], clientId: "c-sharma", color: "#8a5a3b" },
];

/* ---------- Placeholder photos (swap for real uploads later) ---------- */
const face = (n: number) => `https://i.pravatar.cc/160?img=${n}`;
const pic = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const FACES: Record<string, number> = { "u-admin": 12, "u-priya": 47, "u-kabir": 13, "u-rahul": 15, "u-sneha": 44, "u-arjun": 59, "u-isha": 32, "u-dev": 53, "u-client": 68 };
users.forEach((u) => (u.photo = face(FACES[u.id])));
clients.forEach((c) => (c.image = pic(`client-${c.id}`, 200, 200)));

export const labels: Label[] = [
  { id: "l-web", name: "Website", color: "#3f6db3" },
  { id: "l-social", name: "Social", color: "#b4537a" },
  { id: "l-ads", name: "Ads", color: "#b7791f" },
  { id: "l-seo", name: "SEO", color: "#2f7d4f" },
  { id: "l-brand", name: "Branding", color: "#8a5a3b" },
  { id: "l-bug", name: "Bug", color: "#c2410c" },
];

export const boards: Board[] = [
  { id: "b-sharma-web", name: "Website Redesign", clientId: "c-sharma", color: "#8a5a3b", memberIds: ["u-admin", "u-priya", "u-kabir", "u-rahul", "u-sneha", "u-dev"], starred: true },
  { id: "b-green-social", name: "Social Media – December", clientId: "c-green", color: "#2f7d4f", memberIds: ["u-admin", "u-arjun", "u-isha", "u-kabir", "u-dev"], starred: true },
  { id: "b-apex-ads", name: "Google Ads Launch", clientId: "c-apex", color: "#3f6db3", memberIds: ["u-admin", "u-arjun", "u-rahul", "u-dev"] },
  { id: "b-internal", name: "Agency Operations", color: "#1f6f5c", memberIds: ["u-admin", "u-priya", "u-rahul", "u-arjun", "u-dev", "u-isha", "u-sneha", "u-kabir"] },
];

boards.forEach((b) => (b.cover = pic(`cover-${b.id}`, 640, 260)));

const stdLists = (boardId: string): List[] => [
  { id: `${boardId}-req`, boardId, name: "Requests", kind: "requests" },
  { id: `${boardId}-todo`, boardId, name: "To Do" },
  { id: `${boardId}-doing`, boardId, name: "In Progress" },
  { id: `${boardId}-review`, boardId, name: "Internal Review" },
  { id: `${boardId}-approval`, boardId, name: "Client Approval", kind: "approval" },
  { id: `${boardId}-done`, boardId, name: "Done", kind: "done" },
];

export const lists: List[] = [
  ...stdLists("b-sharma-web"),
  ...stdLists("b-green-social"),
  ...stdLists("b-apex-ads"),
  { id: "b-internal-todo", boardId: "b-internal", name: "To Do" },
  { id: "b-internal-doing", boardId: "b-internal", name: "In Progress" },
  { id: "b-internal-done", boardId: "b-internal", name: "Done", kind: "done" },
];

let seq = 0;
const card = (c: Partial<Card> & Pick<Card, "boardId" | "listId" | "title">): Card => {
  seq += 1;
  return {
    id: `k-${seq}`,
    order: seq,
    description: "",
    assigneeIds: [],
    assignedBy: "u-admin",
    priority: "medium",
    labels: [],
    checklist: [],
    comments: [],
    clientVisible: true,
    createdAt: ago(24 * (10 - (seq % 7))),
    history: [{ at: ago(24 * (10 - (seq % 7))), userId: c.assignedBy ?? "u-admin", text: "created this card" }],
    attachments: [],
    ...c,
  };
};

export const cards: Card[] = [
  // Sharma Interiors – Website Redesign
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-req", title: "Add a 'Book site visit' button on every page", assigneeIds: [], priority: "high", labels: ["l-web"], assignedBy: "u-client", description: "Requested by Rohit: customers keep asking how to book a visit. Wants a sticky button." }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-todo", title: "Write copy for the Services page", assigneeIds: ["u-isha"], due: daysFromNow(3), priority: "medium", labels: ["l-web"], checklist: [{ id: "x1", text: "Modular kitchens", done: true }, { id: "x2", text: "Wardrobes", done: false }, { id: "x3", text: "Full home interiors", done: false }] }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-todo", title: "Collect project photos from client", assigneeIds: ["u-dev"], due: daysFromNow(-2), priority: "high", labels: ["l-web"], description: "We need at least 20 good photos of finished homes for the gallery." }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-doing", title: "Homepage design – desktop and mobile", assigneeIds: ["u-priya"], teamId: "t-design", claimedBy: "u-priya", due: daysFromNow(1), priority: "urgent", labels: ["l-web", "l-brand"], checklist: [{ id: "x4", text: "Hero section", done: true }, { id: "x5", text: "Services strip", done: true }, { id: "x6", text: "Gallery", done: false }, { id: "x7", text: "Mobile layout", done: false }], comments: [{ id: "m1", userId: "u-admin", text: "Keep the warm wood tones from their brochure.", internal: true, at: ago(20) }, { id: "m2", userId: "u-priya", text: "Hero and services done, sharing gallery tomorrow.", internal: false, at: ago(5) }], attachments: [{ id: "a1", name: "homepage-v2.fig", size: "4.2 MB" }, { id: "a2", name: "brand-colours.pdf", size: "820 KB" }] }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-doing", title: "Set up Next.js project and hosting", assigneeIds: ["u-rahul"], due: daysFromNow(2), priority: "medium", labels: ["l-web"], clientVisible: false }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-review", title: "Contact form with WhatsApp alert", assigneeIds: ["u-sneha"], due: daysFromNow(4), priority: "medium", labels: ["l-web"] }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-approval", title: "Logo refresh – 3 options", assigneeIds: ["u-kabir"], due: daysFromNow(0), priority: "high", labels: ["l-brand"], description: "Three directions for the refreshed logo. Client to pick one.", attachments: [{ id: "a3", name: "logo-options.pdf", size: "2.1 MB" }] }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-done", title: "Sitemap and page list signed off", assigneeIds: ["u-dev"], priority: "low", labels: ["l-web"] }),
  card({ boardId: "b-sharma-web", listId: "b-sharma-web-done", title: "Competitor website review", assigneeIds: ["u-priya"], priority: "low", labels: ["l-web"], clientVisible: false }),

  // GreenLeaf – Social Media December
  card({ boardId: "b-green-social", listId: "b-green-social-req", title: "Post about the new cold-pressed oils range", priority: "medium", labels: ["l-social"], assignedBy: "u-dev" }),
  card({ boardId: "b-green-social", listId: "b-green-social-todo", title: "December content calendar (30 posts)", assigneeIds: ["u-isha"], due: daysFromNow(-1), priority: "urgent", labels: ["l-social"] }),
  card({ boardId: "b-green-social", listId: "b-green-social-todo", title: "Reel scripts – farm to table series", teamId: "t-mkt", assigneeIds: [], due: daysFromNow(5), priority: "high", labels: ["l-social"], description: "Assigned to the Marketing team. One person to claim it." }),
  card({ boardId: "b-green-social", listId: "b-green-social-doing", title: "Instagram carousel designs – week 1", assigneeIds: ["u-kabir"], due: daysFromNow(2), priority: "high", labels: ["l-social"] }),
  card({ boardId: "b-green-social", listId: "b-green-social-approval", title: "Festive offer creative", assigneeIds: ["u-kabir"], due: daysFromNow(1), priority: "medium", labels: ["l-social", "l-ads"] }),
  card({ boardId: "b-green-social", listId: "b-green-social-done", title: "November performance report", assigneeIds: ["u-arjun"], priority: "low", labels: ["l-social"] }),

  // Apex Motors – Google Ads
  card({ boardId: "b-apex-ads", listId: "b-apex-ads-todo", title: "Keyword research – used cars Bengaluru", assigneeIds: ["u-arjun"], due: daysFromNow(-3), priority: "high", labels: ["l-ads", "l-seo"] }),
  card({ boardId: "b-apex-ads", listId: "b-apex-ads-todo", title: "Landing page for test-drive bookings", teamId: "t-dev", assigneeIds: [], due: daysFromNow(6), priority: "medium", labels: ["l-web", "l-ads"] }),
  card({ boardId: "b-apex-ads", listId: "b-apex-ads-doing", title: "Conversion tracking setup", assigneeIds: ["u-rahul"], due: daysFromNow(0), priority: "urgent", labels: ["l-ads"] }),
  card({ boardId: "b-apex-ads", listId: "b-apex-ads-review", title: "Ad copy – 5 responsive search ads", assigneeIds: ["u-isha", "u-arjun"], due: daysFromNow(2), priority: "medium", labels: ["l-ads"] }),

  // Internal
  card({ boardId: "b-internal", listId: "b-internal-todo", title: "Monthly invoices to all clients", assigneeIds: ["u-dev"], due: daysFromNow(4), priority: "high", clientVisible: false }),
  card({ boardId: "b-internal", listId: "b-internal-todo", title: "Update agency portfolio with 3 new projects", assigneeIds: ["u-priya", "u-isha"], due: daysFromNow(9), priority: "low", clientVisible: false }),
  card({ boardId: "b-internal", listId: "b-internal-doing", title: "Hire a junior developer", assigneeIds: ["u-admin"], due: daysFromNow(12), priority: "medium", clientVisible: false }),
  card({ boardId: "b-internal", listId: "b-internal-done", title: "Team offsite plan", assigneeIds: ["u-admin"], priority: "low", clientVisible: false }),
];

/* Design work gets a cover image and image attachments, like a real design card would. */
const COVERS: Record<string, string> = {
  "Homepage design – desktop and mobile": "card-homepage",
  "Logo refresh – 3 options": "card-logo",
  "Instagram carousel designs – week 1": "card-carousel",
  "Festive offer creative": "card-festive",
};
cards.forEach((c) => {
  const seedName = COVERS[c.title];
  if (seedName) {
    c.cover = pic(seedName, 600, 300);
    if (c.attachments.length === 0) c.attachments = [{ id: `${c.id}-img`, name: `${seedName}.jpg`, size: "1.4 MB" }];
  }
  c.attachments = c.attachments.map((a) => (/\.(jpg|png|fig)$/.test(a.name) ? { ...a, thumb: pic(`att-${a.id}`, 240, 160) } : a));
});

export const requests: ClientRequest[] = [
  { id: "r-1", clientId: "c-sharma", boardId: "b-sharma-web", title: "Add a 'Book site visit' button on every page", description: "Customers keep asking how to book a visit.", priority: "high", wantedBy: daysFromNow(7), status: "accepted", by: "u-client", at: ago(30) },
  { id: "r-2", clientId: "c-sharma", boardId: "b-sharma-web", title: "Show customer testimonials on homepage", description: "We have 15 Google reviews we'd like to show.", priority: "medium", wantedBy: daysFromNow(14), status: "new", by: "u-client", at: ago(3) },
];

export const notifications: Notification[] = [
  { id: "n-1", userId: "u-priya", text: "Aarav assigned you “Homepage design – desktop and mobile”", at: ago(26), read: false, href: "/boards/b-sharma-web?card=k-4", kind: "assigned" },
  { id: "n-2", userId: "u-admin", text: "Rohit Sharma raised a new request: “Show customer testimonials on homepage”", at: ago(3), read: false, href: "/boards/b-sharma-web", kind: "request" },
  { id: "n-3", userId: "u-admin", text: "“Keyword research – used cars Bengaluru” is 3 days overdue (Arjun Das)", at: ago(8), read: false, href: "/boards/b-apex-ads?card=k-16", kind: "overdue" },
  { id: "n-4", userId: "u-admin", text: "“Reel scripts – farm to table series” has not been claimed by Marketing for 24h", at: ago(12), read: true, href: "/boards/b-green-social?card=k-12", kind: "team" },
  { id: "n-5", userId: "u-client", text: "“Logo refresh – 3 options” is ready for your approval", at: ago(2), read: false, href: "/portal/boards/b-sharma-web?card=k-7", kind: "approval" },
  { id: "n-6", userId: "u-priya", text: "Aarav commented on “Homepage design – desktop and mobile”", at: ago(20), read: true, href: "/boards/b-sharma-web?card=k-4", kind: "comment" },
];

export const activity: Activity[] = [
  { id: "ac-1", at: ago(1), userId: "u-priya", text: "moved “Homepage design” to In Progress", boardId: "b-sharma-web" },
  { id: "ac-2", at: ago(2), userId: "u-kabir", text: "sent “Logo refresh – 3 options” for client approval", boardId: "b-sharma-web" },
  { id: "ac-3", at: ago(3), userId: "u-client", text: "raised a request “Show customer testimonials on homepage”", boardId: "b-sharma-web" },
  { id: "ac-4", at: ago(5), userId: "u-arjun", text: "completed “November performance report”", boardId: "b-green-social" },
  { id: "ac-5", at: ago(7), userId: "u-rahul", text: "started “Conversion tracking setup”", boardId: "b-apex-ads" },
  { id: "ac-6", at: ago(9), userId: "u-admin", text: "assigned “Reel scripts – farm to table series” to Marketing", boardId: "b-green-social" },
  { id: "ac-7", at: ago(22), userId: "u-dev", text: "created board “Google Ads Launch” for Apex Motors", boardId: "b-apex-ads" },
];
