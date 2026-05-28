import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-slate-950">
          ThreeSource
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Sign up
          </Link>
        </div>
      </nav>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="mb-4 text-sm font-semibold uppercase text-teal-700">
          Task and time tracking
        </p>
        <h1 className="max-w-3xl text-4xl font-bold text-slate-950 sm:text-5xl">
          Plan focused work, track time honestly, and review each day clearly.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          ThreeSource helps users manage tasks, record real working sessions,
          and understand daily progress. This foundation currently includes
          secure authentication and a protected dashboard shell.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-md bg-teal-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-white"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
