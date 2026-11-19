# Workboard (working name)

A Trello-style task and team tool: anyone can assign work to a person or a whole team, every user gets a **My tasks** dashboard, admins get a **team overview**, and clients get their own **portal** to follow progress, approve work and raise requests.

> **Status: UI prototype.** All screens run on sample data stored in your browser (localStorage). There is no backend yet. Names, companies and photos are placeholders.

## Try it

Use **View as** in the top bar to switch between Admin, Member and Client. **Reset demo data** in the same menu restores the sample data.

## Screens

| Area | Screens |
| --- | --- |
| Everyone | Login (sign in, Google, forgot password, accept invite), Notifications, Settings |
| Team | Home, Board (drag and drop), Card detail, My tasks, Search |
| Admin | Team overview dashboard, Clients, Client detail, Team & people |
| Client portal | My projects, Project board (read-only + approvals), New request |

## Run locally

```bash
npm install
npm run dev -- -p 3090
```

Open http://localhost:3090.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · dnd-kit · lucide-react

## Next step (Phase 1)

Replace `src/lib/store.tsx` (in-memory + localStorage) with Supabase: auth, Postgres tables, Row Level Security, and real-time updates. The store's action names are meant to stay the same, so screens need few changes.

Placeholder photos: [pravatar.cc](https://pravatar.cc) (people) and [picsum.photos](https://picsum.photos) (covers).
