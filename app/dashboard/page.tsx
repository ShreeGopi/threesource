import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const joinedAt = user.created_at
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(user.created_at))
    : "Unknown";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <nav className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">
            Protected workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            ThreeSource dashboard
          </h1>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </form>
      </nav>

      <section className="py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Welcome to your workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            You are signed in as {user.email}. This page is protected on the
            server and only renders when Supabase Auth returns a valid user
            session.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <dt className="text-sm font-medium text-slate-500">User ID</dt>
              <dd className="mt-2 break-all text-sm font-semibold text-slate-900">
                {user.id}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <dt className="text-sm font-medium text-slate-500">Joined</dt>
              <dd className="mt-2 text-sm font-semibold text-slate-900">
                {joinedAt}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
