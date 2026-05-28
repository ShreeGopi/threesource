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

## Deployment

Deployment target: Vercel.

Live demo link: pending.

## Current Milestone Status

Milestone 1 database foundation is implemented in source:

- Fresh Next.js App Router auth foundation from Milestone 0
- Initial SQL migration for `tasks` and `time_logs`
- Supabase Row Level Security policies for user-owned data
- TypeScript database helper types

Intentionally not implemented yet:

- Task CRUD
- Time logs
- Timer start/stop behavior
- Daily productivity summary
- AI task generation
- Productivity charts
