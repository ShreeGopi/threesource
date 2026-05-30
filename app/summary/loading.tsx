function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded bg-slate-200 ${className}`} />;
}

export default function SummaryLoading() {
  return (
    <main
      aria-label="Loading summary"
      className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8"
    >
      <nav className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-pulse space-y-2">
          <SkeletonBlock className="h-4 w-44" />
          <SkeletonBlock className="h-8 w-52" />
        </div>
        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
      </nav>

      <section className="space-y-6 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-6 w-44" />
                <SkeletonBlock className="h-4 w-32" />
              </div>
              <SkeletonBlock className="h-10 w-24" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="space-y-2">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-9 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-3">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-5 w-60 max-w-full" />
            <SkeletonBlock className="h-4 w-44" />
            <SkeletonBlock className="h-8 w-24" />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-4">
            <SkeletonBlock className="h-5 w-48" />
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <SkeletonBlock className="h-4 w-64 max-w-full" />
                <SkeletonBlock className="h-4 w-20" />
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((section) => (
            <section
              key={section}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="animate-pulse space-y-4">
                <SkeletonBlock className="h-5 w-36" />
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="space-y-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <SkeletonBlock className="h-4 w-full max-w-48" />
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
