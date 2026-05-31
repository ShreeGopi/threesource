import Link from "next/link";
import { login } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { ThemeToggle } from "@/components/theme-toggle";

type LoginSearchParams = {
  error?: string;
  message?: string;
};

type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-950"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span>ThreeSource</span>
        </Link>
        <ThemeToggle />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Welcome back
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          Log in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Access your protected task and time tracking workspace.
        </p>

        {params.message ? (
          <p
            role="status"
            className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800"
          >
            {params.message}
          </p>
        ) : null}

        {params.error ? (
          <p
            role="alert"
            data-testid="login-error"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {params.error}
          </p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Email</span>
            <input
              required
              name="email"
              type="email"
              data-testid="login-email"
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Password</span>
            <input
              required
              name="password"
              type="password"
              data-testid="login-password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <PendingSubmitButton
            idleText="Log in"
            pendingText="Signing in..."
            testId="login-submit"
            className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          />
        </form>

        <p className="mt-5 text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-sky-700">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
