"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { DailySummary, SummaryTask } from "@/lib/types/summary";

type SummaryResponse = {
  summary: DailySummary;
};

type ApiErrorResponse = {
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;
    const detailMessage = errorPayload?.details?.[0]?.message;
    throw new Error(detailMessage ?? errorPayload?.error ?? "Request failed.");
  }

  return payload as T;
}

function TaskList({
  tasks,
  emptyMessage,
}: {
  tasks: SummaryTask[];
  emptyMessage: string;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex min-w-0 flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
        >
          <span className="min-w-0 break-words font-medium text-slate-950">
            {task.title}
          </span>
          <span className="text-sm text-slate-500">
            Updated {formatDateTime(task.updated_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded bg-slate-200 ${className}`} />;
}

function SummaryStatsSkeleton() {
  return (
    <div
      data-testid="summary-stats-loading"
      aria-label="Loading summary stats"
      className="mt-6 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
}

function SummarySectionsSkeleton() {
  return (
    <div
      data-testid="summary-sections-loading"
      aria-label="Loading summary sections"
      className="space-y-6"
    >
      <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-5 w-60 max-w-full" />
          <SkeletonBlock className="h-4 w-44" />
          <SkeletonBlock className="h-8 w-24" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
    </div>
  );
}

export function DailySummaryPanel({ userEmail }: { userEmail: string | null }) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setIsLoading(true);
    setError(null);

    try {
      const offsetMinutes = new Date().getTimezoneOffset();
      const response = await fetch(
        `/api/summary/today?timezone_offset_minutes=${offsetMinutes}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );
      const payload = await readApiResponse<SummaryResponse>(response);
      setSummary(payload.summary);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load daily summary.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  return (
    <section data-testid="daily-summary" className="space-y-6 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {userEmail ?? "Signed in"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Today&apos;s summary
            </h2>
            {summary ? (
              <p className="mt-2 text-sm text-slate-600">
                Local day {summary.date}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={isLoading}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {isLoading ? <SummaryStatsSkeleton /> : null}

        {error ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {summary ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Total tracked
              </p>
              <p
                data-testid="summary-total-tracked"
                className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-950"
              >
                {formatDuration(summary.total_tracked_seconds)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Worked tasks
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.tasks_worked_on.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.completed_tasks.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Open</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.pending_tasks.length +
                  summary.in_progress_tasks.length}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? <SummarySectionsSkeleton /> : null}

      {summary ? (
        <>
          {summary.active_log ? (
            <section
              data-testid="summary-active-log"
              className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                Active timer
              </p>
              <h3 className="mt-2 min-w-0 break-words text-lg font-semibold text-slate-950">
                {summary.active_log.task?.title ?? "Active task"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Started {formatDateTime(summary.active_log.started_at)}
              </p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-slate-950">
                {formatDuration(summary.active_log.elapsed_seconds)}
              </p>
            </section>
          ) : null}

          <section
            data-testid="summary-worked"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-950">
              Tasks worked on today
            </h3>
            {summary.tasks_worked_on.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No tracked task activity yet today.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {summary.tasks_worked_on.map((task) => (
                  <li
                    key={task.id}
                    className="flex min-w-0 flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-words font-medium text-slate-950">
                      {task.title}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-700">
                      {formatDuration(task.time_tracked_seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section
              data-testid="summary-completed"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-950">
                Completed today
              </h3>
              <div className="mt-4">
                <TaskList
                  tasks={summary.completed_tasks}
                  emptyMessage="No tasks marked completed today."
                />
              </div>
            </section>

            <section
              data-testid="summary-pending"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-950">Pending</h3>
              <div className="mt-4">
                <TaskList
                  tasks={summary.pending_tasks}
                  emptyMessage="No pending tasks."
                />
              </div>
            </section>

            <section
              data-testid="summary-in-progress"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-950">
                In progress
              </h3>
              <div className="mt-4">
                <TaskList
                  tasks={summary.in_progress_tasks}
                  emptyMessage="No in-progress tasks."
                />
              </div>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
