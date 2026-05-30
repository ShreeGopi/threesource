function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded bg-slate-200 ${className}`} />;
}

function DashboardTaskCardSkeleton({ item }: { item: number }) {
  return (
    <article
      key={item}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="animate-pulse space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-5 w-52 max-w-full" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-4 w-full max-w-2xl" />
            <SkeletonBlock className="h-4 w-4/5 max-w-xl" />
          </div>
          <SkeletonBlock className="h-10 w-full sm:w-44" />
        </div>
        <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <SkeletonBlock className="h-4 w-40" />
          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-9 w-16" />
            <SkeletonBlock className="h-9 w-16" />
            <SkeletonBlock className="h-9 w-20" />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DashboardLoading() {
  return (
    <main
      aria-label="Loading dashboard"
      className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8"
    >
      <nav className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-pulse space-y-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-8 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-10 w-24" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
      </nav>

      <section className="space-y-8 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-5">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-6 w-24" />
              </div>
              <div className="flex flex-wrap gap-4">
                <SkeletonBlock className="h-4 w-14" />
                <SkeletonBlock className="h-4 w-14" />
                <SkeletonBlock className="h-4 w-14" />
              </div>
            </div>
            <SkeletonBlock className="h-11 w-full" />
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonBlock className="h-11 w-full" />
              <SkeletonBlock className="h-11 w-full" />
            </div>
            <div className="flex justify-end">
              <SkeletonBlock className="h-10 w-28" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <DashboardTaskCardSkeleton key={item} item={item} />
          ))}
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <SkeletonBlock className="h-6 w-28" />
              <SkeletonBlock className="mt-2 h-4 w-64 max-w-full" />
            </div>
            {[0, 1].map((item) => (
              <div
                key={item}
                className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2">
                  <SkeletonBlock className="h-5 w-56 max-w-full" />
                  <SkeletonBlock className="h-4 w-64 max-w-full" />
                </div>
                <div className="flex gap-3">
                  <SkeletonBlock className="h-5 w-16" />
                  <SkeletonBlock className="h-9 w-28" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
