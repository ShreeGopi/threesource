# ThreeSource

ThreeSource is a full-stack task and time tracking app for managing focused work, recording real-time sessions, and reviewing daily productivity.

## Tech Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Zod
- Tailwind CSS
- Vercel deployment

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example to a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Supabase project credentials to `.env.local`. Do not commit
   `.env.local`.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` from `.env.example` and fill in the Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Database Setup

The initial Supabase schema lives at
`supabase/migrations/001_initial_schema.sql`.

To apply it with the Supabase SQL editor, open your Supabase project, create a
new SQL query, paste the contents of the migration file, and run it once.

If the Supabase CLI is configured and linked for this project, apply migrations
with:

```bash
supabase db push
```

## Database Design Notes

- `tasks` are owned by `user_id` and use the `task_status` enum.
- `time_logs` are owned by `user_id` and linked to `tasks` through `task_id`.
- Row Level Security is enabled on both tables to prevent cross-user access.
- Time log policies verify that inserted or updated logs reference a task owned
  by the same authenticated user.
- A partial unique index enforces one active timer per user at the database
  level.

## Task API

Task CRUD is exposed through REST-style Next.js Route Handlers:

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/[id]`
- `PATCH /api/tasks/[id]`
- `DELETE /api/tasks/[id]`

All task routes require a Supabase Auth session, derive `user_id` from the
authenticated user, validate request bodies with Zod, and filter reads,
updates, and deletes by the authenticated user.

## Timer API

Time tracking is exposed through REST-style Next.js Route Handlers:

- `POST /api/tasks/[id]/start`
- `POST /api/tasks/[id]/stop`
- `GET /api/time-logs`
- `GET /api/tasks/[id]/time-logs`

Timer sessions are stored in the `time_logs` table. Each row belongs to the
authenticated user and links to a task through `task_id`. The database enforces
one active timer per user with a partial unique index where `ended_at is null`.

The dashboard shows live elapsed time from the stored `started_at`, total
completed time per task, and a simple all-time-logs view. Daily productivity
summary is still planned for Milestone 4.

## Deployment

Deployment target: Vercel.

Live demo link: pending.

## Current Milestone Status

Milestone 3 timer tracking is implemented in source:

- Fresh Next.js App Router auth foundation from Milestone 0
- Initial SQL migration for `tasks` and `time_logs`
- Supabase Row Level Security policies for user-owned data
- TypeScript database helper types
- REST task CRUD route handlers
- Protected dashboard task UI
- REST timer start/stop route handlers
- Time log list route handlers
- Live elapsed timer display
- Total completed time per task

Intentionally not implemented yet:

- Daily productivity summary
- Weekly summary
- AI task generation
- Productivity charts
- Reminders
