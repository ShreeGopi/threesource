import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
      <nav className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-950"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span>ThreeSource</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-4"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:px-4"
          >
            Sign up
          </Link>
        </div>
      </nav>

      <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            Precision productivity dashboard
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Tasks, timers, and a clear daily readout.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            ThreeSource gives each user a private workspace to capture tasks,
            run real work sessions, and review today&apos;s progress without
            noise.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-md bg-sky-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              Log in
            </Link>
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 text-sm text-slate-700 sm:grid-cols-3">
            {["Protected tasks", "Real timer sessions", "Daily summary"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm"
                >
                  <span className="block h-1 w-8 rounded-full bg-sky-500" />
                  <p className="mt-3 font-semibold">{item}</p>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Active focus
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Follow up with UI Designer
                </h2>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                In Progress
              </span>
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Current</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-950">
                  24m 18s
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Today</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-950">
                  2h 10m
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Done</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">4</p>
              </div>
            </div>
            <div className="space-y-3">
              {["Write API notes", "Review daily summary", "Ship polish"].map(
                (item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {item}
                    </span>
                    <span className="text-xs text-slate-500">
                      {index === 0 ? "12m" : index === 1 ? "34m" : "Ready"}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
