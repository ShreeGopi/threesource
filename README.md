# ThreeSource - Task and Time Tracking App

ThreeSource is a full-stack task and time tracking app built for the assignment brief. Users can sign up, manage their own tasks, start and stop real-time timers, review stored time log sessions, and see a current-day productivity summary.

## Live Demo

Live Demo: [Live on vercel;)](https://threesource.vercel.app/)

## Tech Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Zod
- Tailwind CSS
- Vercel

## Core Features

- Sign up, login, and logout
- Protected dashboard and summary routes
- User-owned task CRUD
- Natural language task input with optional title and description override
- Task statuses: `pending`, `in_progress`, `completed`
- Start/stop timer per task
- One active timer per user
- Stored time log sessions
- Total tracked time per task
- Daily productivity summary
- Protected REST APIs
- RLS-backed data isolation

## API Overview

All API routes require an authenticated Supabase user unless noted otherwise. The server derives `user_id` from the auth session and never trusts client-provided ownership.

### Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/[id]`
- `PATCH /api/tasks/[id]`
- `DELETE /api/tasks/[id]`

### Timers and Time Logs

- `POST /api/tasks/[id]/start`
- `POST /api/tasks/[id]/stop`
- `GET /api/time-logs`
- `GET /api/tasks/[id]/time-logs`

### Summary

- `GET /api/summary/today`

## Database Setup

The initial Supabase SQL lives here:

```bash
supabase/migrations/001_initial_schema.sql
```

For a manual setup, open the Supabase SQL Editor, paste the migration contents, and run it once.

The migration creates:

- `tasks`
- `time_logs`
- `task_status` enum
- required constraints and indexes
- Row Level Security policies on `tasks` and `time_logs`
- a partial unique index that enforces one active timer per user

If Supabase CLI is configured and linked, the migration can also be applied with:

```bash
supabase db push
```

## Environment Variables

Create `.env.local` from `.env.example` and fill in your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit `.env.local`.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment placeholders:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in Supabase values in `.env.local`.

4. Run the Supabase SQL migration from `supabase/migrations/001_initial_schema.sql`.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

7. Before submission, verify the production build:

   ```bash
   npm run typecheck
   npm run build
   ```

## Testing

Run the core checks:

```bash
npm run typecheck
npm run build
```

Run the Playwright smoke suite:

```bash
npm run test:e2e
```

For headed browser mode:

```bash
npm run test:e2e:headed
```

The E2E suite requires an existing confirmed Supabase test user:

```bash
E2E_TEST_EMAIL= testgopi@gmail.com
E2E_TEST_PASSWORD= testgopi@gmail.com
```

Install Playwright browser binaries locally if they are not already present:

```bash
npx playwright install chromium
```

Signup email confirmation is still manually tested because it depends on the configured Supabase email flow.

## Deployment Notes

Deploy the project to Vercel.

1. Push the repository to GitHub.
2. Import the repo in Vercel.
3. Add these environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase Auth settings, update the Site URL and redirect URLs for the deployed Vercel URL.
5. Confirm `.env.local` is not committed.
6. Run a deployed smoke test for signup, login, dashboard, task CRUD, timer start/stop, and summary.

## Assumptions and Design Notes

- Dashboard is the live timer view.
- `/summary` is a point-in-time snapshot. Use Refresh to update active timer elapsed time.
- Dashboard and summary use skeleton loading states for smoother route and data loading.
- Starting a timer on a pending task moves it to `in_progress`.
- Only one active timer per user is allowed to prevent inflated tracked time.
- Completed-today uses `status = completed` plus `updated_at` within today because the schema does not currently include `completed_at`.
- Daily summary uses local-day boundaries from the browser timezone offset.
- Vercel Speed Insights can be added later for production performance monitoring if needed.
- AI task generation, charts, reminders, and weekly summaries are intentionally not included because they are optional or bonus scope.

## Test Credentials

Test credentials: 
email: testgopi@gmail.com
password: testgopi@gmail.com

## Screenshots / Demo

Screenshots can be added here before final submission:

- Landing page
- Dashboard with tasks
- Active timer
- Time logs
- Daily summary
