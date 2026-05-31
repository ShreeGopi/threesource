import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { DailySummaryPanel } from "@/components/summary/daily-summary";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?message=Please%20log%20in%20to%20continue.");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6">
      <nav className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm backdrop-blur sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Productivity summary
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Daily summary
          </h1>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <form action={logout}>
            <PendingSubmitButton
              idleText="Log out"
              pendingText="Signing out..."
              testId="logout-submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            />
          </form>
        </div>
      </nav>

      <DailySummaryPanel userEmail={user.email ?? null} />
    </main>
  );
}
