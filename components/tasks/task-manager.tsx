"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { formatDateTime, formatDuration } from "@/lib/format";
import type {
  Task,
  TaskStatus,
  TimeLogWithTask,
} from "@/lib/types/database";

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const statusStyles: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-cyan-50 text-cyan-800",
  completed: "bg-emerald-50 text-emerald-800",
};

type TasksResponse = {
  tasks: Task[];
};

type TaskResponse = {
  task: Task;
};

type TimeLogsResponse = {
  time_logs: TimeLogWithTask[];
};

type TimeLogResponse = {
  time_log: TimeLogWithTask;
};

type ApiErrorResponse = {
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
};

type EditForm = {
  title: string;
  description: string;
  status: TaskStatus;
};

type TaskUpdatePayload = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;
    const detailMessage = errorPayload?.details?.[0]?.message;
    throw new Error(detailMessage ?? errorPayload?.error ?? "Request failed.");
  }

  return payload as T;
}

function buildTaskPayload(values: {
  originalInput: string;
  title: string;
  description: string;
}) {
  return {
    original_input: values.originalInput,
    ...(values.title.trim() ? { title: values.title.trim() } : {}),
    ...(values.description.trim()
      ? { description: values.description.trim() }
      : {}),
  };
}

function getElapsedSeconds(startedAt: string, now: number) {
  return Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
}

export function TaskManager({ userEmail }: { userEmail: string | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogWithTask[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    originalInput: "",
    title: "",
    description: "",
  });
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    status: "pending",
  });

  const activeLog = useMemo(
    () => timeLogs.find((log) => log.ended_at === null) ?? null,
    [timeLogs],
  );

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );

  const totalSecondsByTask = useMemo(() => {
    const totals = new Map<string, number>();

    timeLogs.forEach((log) => {
      if (log.ended_at && log.duration_seconds !== null) {
        totals.set(
          log.task_id,
          (totals.get(log.task_id) ?? 0) + log.duration_seconds,
        );
      }
    });

    return totals;
  }, [timeLogs]);

  async function loadDashboardData() {
    setError(null);

    try {
      const [tasksResponse, logsResponse] = await Promise.all([
        fetch("/api/tasks", {
          headers: {
            Accept: "application/json",
          },
        }),
        fetch("/api/time-logs", {
          headers: {
            Accept: "application/json",
          },
        }),
      ]);

      const [tasksPayload, logsPayload] = await Promise.all([
        readApiResponse<TasksResponse>(tasksResponse),
        readApiResponse<TimeLogsResponse>(logsResponse),
      ]);

      setTasks(tasksPayload.tasks);
      setTimeLogs(logsPayload.time_logs);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildTaskPayload(createForm)),
      });
      const payload = await readApiResponse<TaskResponse>(response);
      setTasks((currentTasks) => [payload.task, ...currentTasks]);
      setCreateForm({
        originalInput: "",
        title: "",
        description: "",
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create task.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
    });
  }

  async function updateTask(taskId: string, updates: TaskUpdatePayload) {
    setError(null);
    setUpdatingId(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updates),
      });
      const payload = await readApiResponse<TaskResponse>(response);
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? payload.task : task)),
      );
      return payload.task;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update task.",
      );
      return null;
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
    taskId: string,
  ) {
    event.preventDefault();

    const updatedTask = await updateTask(taskId, {
      title: editForm.title,
      description: editForm.description.trim() ? editForm.description : null,
      status: editForm.status,
    });

    if (updatedTask) {
      setEditingId(null);
    }
  }

  async function handleStatusChange(
    task: Task,
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const status = event.target.value as TaskStatus;
    await updateTask(task.id, { status });
  }

  async function handleDeleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    setError(null);
    setDeletingId(task.id);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await readApiResponse(response);
      }

      setTasks((currentTasks) =>
        currentTasks.filter((currentTask) => currentTask.id !== task.id),
      );
      setTimeLogs((currentLogs) =>
        currentLogs.filter((log) => log.task_id !== task.id),
      );
      if (editingId === task.id) {
        setEditingId(null);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete task.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStartTimer(task: Task) {
    setError(null);
    setTimerTaskId(task.id);

    try {
      const response = await fetch(`/api/tasks/${task.id}/start`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readApiResponse<TimeLogResponse>(response);
      setTimeLogs((currentLogs) => [payload.time_log, ...currentLogs]);

      if (task.status === "pending") {
        setTasks((currentTasks) =>
          currentTasks.map((currentTask) =>
            currentTask.id === task.id
              ? { ...currentTask, status: "in_progress" }
              : currentTask,
          ),
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start timer.",
      );
    } finally {
      setTimerTaskId(null);
    }
  }

  async function handleStopTimer(task: Task) {
    setError(null);
    setTimerTaskId(task.id);

    try {
      const response = await fetch(`/api/tasks/${task.id}/stop`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readApiResponse<TimeLogResponse>(response);
      setTimeLogs((currentLogs) =>
        currentLogs.map((log) =>
          log.id === payload.time_log.id ? payload.time_log : log,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to stop timer.",
      );
    } finally {
      setTimerTaskId(null);
    }
  }

  return (
    <section className="space-y-8 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {userEmail ?? "Signed in"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Tasks
            </h2>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span>
              <span className="font-semibold text-slate-950">
                {tasks.length}
              </span>{" "}
              total
            </span>
            <span>
              <span className="font-semibold text-slate-950">
                {completedCount}
              </span>{" "}
              done
            </span>
            <span>
              <span className="font-semibold text-slate-950">
                {tasks.length - completedCount}
              </span>{" "}
              open
            </span>
          </div>
        </div>

        <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">
              Natural language task
            </span>
            <input
              required
              value={createForm.originalInput}
              onChange={(event) =>
                setCreateForm((currentForm) => ({
                  ...currentForm,
                  originalInput: event.target.value,
                }))
              }
              maxLength={500}
              placeholder="Follow up with designer"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Title override
              </span>
              <input
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((currentForm) => ({
                    ...currentForm,
                    title: event.target.value,
                  }))
                }
                maxLength={160}
                placeholder="Follow up with UI Designer"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Description
              </span>
              <input
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((currentForm) => ({
                    ...currentForm,
                    description: event.target.value,
                  }))
                }
                maxLength={2000}
                placeholder="Confirm wireframe delivery status"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isCreating ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            Loading tasks...
          </p>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <h3 className="text-base font-semibold text-slate-950">
              No tasks yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Create your first task above.
            </p>
          </div>
        ) : null}

        {tasks.map((task) => {
          const isEditing = editingId === task.id;
          const isBusy =
            updatingId === task.id ||
            deletingId === task.id ||
            timerTaskId === task.id;
          const taskActiveLog =
            activeLog && activeLog.task_id === task.id ? activeLog : null;
          const isAnotherTaskRunning = Boolean(
            activeLog && activeLog.task_id !== task.id,
          );
          const completedSeconds = totalSecondsByTask.get(task.id) ?? 0;
          const activeSeconds = taskActiveLog
            ? getElapsedSeconds(taskActiveLog.started_at, now)
            : 0;

          return (
            <article
              key={task.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              {isEditing ? (
                <form
                  onSubmit={(event) => handleEditSubmit(event, task.id)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-800">
                        Title
                      </span>
                      <input
                        required
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm((currentForm) => ({
                            ...currentForm,
                            title: event.target.value,
                          }))
                        }
                        maxLength={160}
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-800">
                        Status
                      </span>
                      <select
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm((currentForm) => ({
                            ...currentForm,
                            status: event.target.value as TaskStatus,
                          }))
                        }
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">
                      Description
                    </span>
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((currentForm) => ({
                          ...currentForm,
                          description: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      rows={3}
                      className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {updatingId === task.id ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-semibold text-slate-950">
                          {task.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
                        >
                          {statusLabels[task.status]}
                        </span>
                        {taskActiveLog ? (
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                            Tracking {formatDuration(activeSeconds)}
                          </span>
                        ) : null}
                      </div>
                      {task.description ? (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                          {task.description}
                        </p>
                      ) : null}
                    </div>

                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      disabled={isBusy}
                      onChange={(event) => handleStatusChange(task, event)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-44"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="font-medium text-slate-500">
                        Completed time
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatDuration(completedSeconds)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-500">Current run</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {taskActiveLog ? formatDuration(activeSeconds) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-500">Updated</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatDateTime(task.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-slate-500">
                      Created {formatDateTime(task.created_at)}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {taskActiveLog ? (
                        <button
                          type="button"
                          onClick={() => handleStopTimer(task)}
                          disabled={isBusy}
                          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {timerTaskId === task.id ? "Stopping..." : "Stop"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartTimer(task)}
                          disabled={isBusy || isAnotherTaskRunning}
                          title={
                            isAnotherTaskRunning
                              ? "Stop the active timer before starting another task."
                              : undefined
                          }
                          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {timerTaskId === task.id ? "Starting..." : "Start"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(task)}
                        disabled={isBusy}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        disabled={isBusy}
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        {deletingId === task.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-semibold text-slate-950">Time logs</h2>
          <p className="text-sm text-slate-600">
            Stored work sessions for your tasks.
          </p>
        </div>

        {isLoading ? (
          <p className="py-6 text-sm text-slate-600">Loading time logs...</p>
        ) : null}

        {!isLoading && timeLogs.length === 0 ? (
          <div className="py-8 text-center">
            <h3 className="text-base font-semibold text-slate-950">
              No time logs yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Start and stop a task timer to create your first log.
            </p>
          </div>
        ) : null}

        {timeLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">Task</th>
                  <th className="py-3 pr-4 font-medium">Started</th>
                  <th className="py-3 pr-4 font-medium">Ended</th>
                  <th className="py-3 pr-4 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map((log) => {
                  const isActive = log.ended_at === null;
                  const durationSeconds = isActive
                    ? getElapsedSeconds(log.started_at, now)
                    : log.duration_seconds ?? 0;

                  return (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-950">
                        {log.tasks?.title ?? "Deleted task"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {formatDateTime(log.started_at)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {log.ended_at ? formatDateTime(log.ended_at) : "Active"}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-950">
                        {formatDuration(durationSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}
