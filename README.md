# ThreeSource

A full-stack task and time tracking app. You create tasks, run timers against them, and at the end of the day you get a clear picture of where your time actually went.

Built as a full-stack assignment covering auth, REST APIs, real-time UI, and daily productivity summaries.

---

## Live Demo

**[https://threesource.vercel.app](https://threesource.vercel.app)**

Test credentials if you want to skip signup:

```
Email:    threesource@gmail.com
Password: threesource@gmail.com
```
```
.env credentials
```
NEXT_PUBLIC_SUPABASE_URL= https://npkunvdiasyxttflrpiv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY= sb_publishable_p0_8h-22-4sD82CSIp6H_w_UFcQJFWh
---

## What it does

**Tasks**
Create a task by typing what you need to do in plain language. Give it a clearer title and description if you want, or just leave it as-is. Tasks have three states: Pending, In Progress, and Completed. You can edit, update, or delete them at any time.

**Timers**
Each task has a Start and Stop button. Hit Start and a live timer begins ticking. Hit Stop and that session gets saved as a time log. Only one task can run at a time — this keeps your tracked time honest. If a task is Pending when you start the timer, it automatically moves to In Progress.

**Time logs**
Every session you run is saved. The dashboard groups them by task so you can see the full history — when you started, when you stopped, and how long each session was.

**Daily summary**
The `/summary` page gives you a snapshot of today: total time tracked, which tasks you worked on and for how long, what you completed, and what is still open. It respects your local timezone so "today" actually means today.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router (v16) |
| Language | TypeScript |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| Data security | Row Level Security |
| Validation | Zod |
| Styles | Tailwind CSS v4 |
| Deployment | Vercel |
| Tests | Playwright |

---

## Running it locally

**1. Clone and install**

```bash
git clone https://github.com/your-username/threesource.git
cd threesource
npm install
```

**2. Set up environment**

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase project values:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find both in your Supabase project under Settings → API.

**3. Set up the database**

Open the Supabase SQL Editor, paste the contents of `supabase/migrations/001_initial_schema.sql`, and run it. This creates the `tasks` and `time_logs` tables, the `task_status` enum, all constraints, indexes, and Row Level Security policies.

If you have the Supabase CLI set up:

```bash
supabase db push
```

**4. Start the app**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**5. Before you ship, verify the build**

```bash
npm run typecheck
npm run build
```

---

## API overview

Every route requires an authenticated Supabase session. The server always reads `user_id` from the session — it is never accepted from the client.

### Tasks

| Method | Route | What it does |
|---|---|---|
| GET | `/api/tasks` | List all your tasks |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/[id]` | Get one task |
| PATCH | `/api/tasks/[id]` | Edit a task |
| DELETE | `/api/tasks/[id]` | Delete a task |

### Timers and time logs

| Method | Route | What it does |
|---|---|---|
| POST | `/api/tasks/[id]/start` | Start the timer for a task |
| POST | `/api/tasks/[id]/stop` | Stop the timer and save the session |
| GET | `/api/time-logs` | List all your time logs |
| GET | `/api/tasks/[id]/time-logs` | List time logs for one task |

### Summary

| Method | Route | What it does |
|---|---|---|
| GET | `/api/summary/today?timezone_offset_minutes=X` | Today's productivity summary |

Pass your local timezone offset from `new Date().getTimezoneOffset()`. Defaults to UTC if omitted.

---

## How data is kept secure

Two layers protect every piece of data:

**Application layer** — Every API route calls `getAuthenticatedUser()` first. If there is no valid session, it returns 401. Every query filters by `user_id = auth user's id` before touching the database.

**Database layer (RLS)** — Row Level Security policies on both tables enforce the same rules at the Postgres level. Even if a query somehow bypassed the application check, the database would refuse to return or modify another user's rows.

---

## Design decisions worth knowing

**One active timer per user**
You can only run one task timer at a time. This is intentional — it prevents accidentally double-counting time and keeps the tracked data accurate. The Start button on all other tasks is disabled while one is running. This rule is also enforced at the database level with a partial unique index.

**Pending → In Progress on timer start**
If you start a timer on a Pending task, it automatically moves to In Progress. This removes a manual step that most people would forget anyway.

**Completing a task with a running timer**
If you try to mark a task Completed while its timer is running, you get a confirmation prompt first. Confirming stops the timer, saves the session, then marks the task Completed. No time is lost.

**Completed tasks in the daily summary**
The summary shows tasks as "completed today" when their `status` is `completed` and their `updated_at` timestamp falls within today's local day. There is no dedicated `completed_at` column in the schema. This is a reasonable approximation for a same-day workflow and is documented here so it is not a surprise.

**Summary is a snapshot, not a live view**
The `/dashboard` page is your live workspace — timers tick in real time there. The `/summary` page is a point-in-time snapshot. Use the Refresh button to pull the latest data, including any active timer's elapsed time.

---

## Testing

**Type check and build**

```bash
npm run typecheck
npm run build
```

**Playwright E2E suite**

The E2E tests need a confirmed Supabase test user. Set the credentials in your environment, then run:

```bash
npm run test:e2e
```

Or with the browser visible:

```bash
npm run test:e2e:headed
```

Install browser binaries if you have not already:

```bash
npx playwright install chromium
```

**What the E2E suite covers**

- Logged-out protected routes redirect to login with a message
- Invalid credentials show the right error
- Full auth flow: login, dashboard loads, logout
- Task CRUD: create, edit, update status, delete
- Timer flow: start, live update, block second timer, stop, log appears
- Completing a task with an active timer stops the timer first
- Daily summary shows all four sections correctly
- Long task titles do not break the layout

---

## Deployment

The app is deployed on Vercel.

1. Push the repository to GitHub
2. Import it in Vercel
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase Auth settings, update Site URL and redirect URLs to your Vercel domain
5. Make sure `.env.local` is not committed (it is in `.gitignore` by default)

---

## What is not here

These were intentionally left out because they are optional or bonus scope and the core app needed to be solid first:

- AI task title/description generation
- Productivity charts
- Weekly summaries
- Reminders or notifications
- Due dates

The foundation is clean enough that any of these could be added on top without reworking what is already here.

---

## Project structure

```
app/
  actions/auth.ts        # Server actions for login, signup, logout
  api/
    tasks/               # Task CRUD route handlers
    time-logs/           # Time log list route
    summary/today/       # Daily summary route
  dashboard/             # Protected task manager page
  summary/               # Protected daily summary page
  login/ signup/         # Auth pages

components/
  auth/                  # Pending submit button
  tasks/                 # TaskManager client component
  summary/               # DailySummaryPanel client component

lib/
  api/                   # Shared auth helper, response helpers, task ownership
  auth/                  # Auth error message helpers
  supabase/              # Client, server, middleware, env config
  types/                 # Database types and summary types
  validations/           # Zod schemas for tasks, time logs, summary, auth
  format.ts              # formatDuration and formatDateTime helpers
  summary.ts             # Day boundary and overlap calculation helpers

supabase/
  migrations/            # SQL migration: schema, RLS, indexes

tests/
  e2e/                   # Playwright smoke suite
```
