import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { DailySummaryPanel } from "@/components/summary/daily-summary";
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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <nav className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">
            Productivity summary
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Daily summary
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>

      <DailySummaryPanel userEmail={user.email ?? null} />
    </main>
  );
}
