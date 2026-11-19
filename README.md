# Workboard (working name)

A Trello-style task and team tool: anyone can assign work to a person or a whole team, every user gets a **My tasks** dashboard, admins get a **team overview**, and clients get their own **portal** to follow progress, approve work and raise requests.

> **Status: Phase 1 (backend) built.** Without Supabase keys it runs as the click-through demo on sample data; with keys it runs on a real database with sign-in and role-based access. Sample names, companies and photos are placeholders.

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

## Two modes

| | Demo | Live |
| --- | --- | --- |
| When | no Supabase keys in `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set |
| Data | sample data in your browser | Supabase Postgres, shared by everyone |
| Sign-in | "View as" switcher | emailed one-time sign-in link |
| Updates | only you | real time across all open screens |

## Live setup (Phase 1)

1. Create a Supabase project, then apply the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   This runs `supabase/migrations/20261119000001_init.sql`: tables, Row Level Security, the sign-up gate, the client-review function, realtime, and starter teams and labels.
2. In Supabase → Authentication → URL configuration, set the Site URL to your app URL and add `<app-url>/auth/callback` to the redirect URLs.
3. Copy `.env.example` to `.env.local` (and to Vercel env vars) and fill in the URL and anon key.
4. **The first person to sign in becomes the admin.** After that, only emails an admin invites (Team & people, or a client's page) get access; anyone else lands on a "Waiting for access" screen.

### Who sees what (enforced by the database)

- **Admin**: everything.
- **Member**: projects they are a member of (or created).
- **Client**: their own company's projects, client-visible tasks only, never internal comments. They approve or send back work through a checked database function, not a direct edit.
- **Viewer**: signed in but not invited, sees nothing.

### How it fits together

- `src/lib/store.tsx` keeps the same actions as the demo. In live mode each click updates the screen at once, then `src/lib/live.ts` writes only the rows that changed. Other people's changes arrive through Supabase Realtime and reload the data.
- `src/middleware.ts` keeps the sign-in cookie fresh and sends signed-out visitors to `/login`.
- `src/app/auth/callback` turns the emailed link into a session.

Note: Supabase's built-in email sender allows only a few sign-in emails per hour. Add your own SMTP (Authentication → Emails) before inviting the whole team.

Placeholder photos: [pravatar.cc](https://pravatar.cc) (people) and [picsum.photos](https://picsum.photos) (covers).
