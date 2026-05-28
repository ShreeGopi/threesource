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

2. Copy the environment example:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Supabase project credentials to `.env.local`.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Deployment

Deployment target: Vercel.

Live demo link: pending.

## Current Milestone Status

Milestone 0 is implemented:

- Fresh Next.js App Router project foundation
- TypeScript and Tailwind CSS setup
- Supabase SSR client utilities
- Sign up, log in, and log out flows
- Protected `/dashboard` route
- Environment variable example

Intentionally not implemented yet:

- Task CRUD
- Database schema
- Supabase RLS policies
- Time logs
- Timer start/stop behavior
- Daily productivity summary
- AI task generation
- Productivity charts
