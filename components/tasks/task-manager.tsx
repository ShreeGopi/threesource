"use client";

import {
  useEffect,
  useMemo,
  useRef,
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

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

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

type TimeLogGroup = {
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus | null;
  logs: TimeLogWithTask[];
  totalSeconds: number;
  latestStartedAt: string;
  hasActiveLog: boolean;
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;
    const detailMessage = errorPayload?.details?.[0]?.message;
    throw new ApiRequestError(
      detailMessage ??
        errorPayload?.error ??
        `Request failed with status ${response.status}.`,
      response.status,
    );
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

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded bg-slate-200 ${className}`} />;
}

function TaskCardsSkeleton() {
  return (
    <div
      data-testid="task-list-loading"
      aria-label="Loading tasks"
      className="space-y-4"
    >
      {[0, 1, 2].map((item) => (
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
      ))}
    </div>
  );
}

function TimeLogsSkeleton() {
  return (
    <div
      data-testid="time-logs-loading"
      aria-label="Loading time logs"
      className="mt-4 divide-y divide-slate-100"
    >
      {[0, 1].map((item) => (
        <div key={item} className="py-4 first:pt-0 last:pb-0">
          <div className="animate-pulse space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-56 max-w-full" />
                <SkeletonBlock className="h-4 w-64 max-w-full" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SkeletonBlock className="h-5 w-16" />
                <SkeletonBlock className="h-9 w-28" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
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
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedLogTaskIds, setExpandedLogTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const deletingTaskIdsRef = useRef(new Set<string>());
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

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  function showSuccess(message: string) {
    setError(null);
    setNotice(message);
  }

  function showError(message: string) {
    setNotice(null);
    setError(message);
  }

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

  const taskStatusById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.status])),
    [tasks],
  );

  const timeLogGroups = useMemo(() => {
    const groups = new Map<string, TimeLogGroup>();

    timeLogs.forEach((log) => {
      const isActive = log.ended_at === null;
      const durationSeconds = isActive
        ? getElapsedSeconds(log.started_at, now)
        : log.duration_seconds ?? 0;
      const existingGroup = groups.get(log.task_id);
      const taskStatus =
        taskStatusById.get(log.task_id) ?? log.tasks?.status ?? null;

      if (existingGroup) {
        existingGroup.taskStatus = taskStatus ?? existingGroup.taskStatus;
        existingGroup.logs.push(log);
        existingGroup.totalSeconds += durationSeconds;
        existingGroup.hasActiveLog = existingGroup.hasActiveLog || isActive;

        if (
          new Date(log.started_at).getTime() >
          new Date(existingGroup.latestStartedAt).getTime()
        ) {
          existingGroup.latestStartedAt = log.started_at;
        }

        return;
      }

      groups.set(log.task_id, {
        taskId: log.task_id,
        taskTitle: log.tasks?.title ?? "Deleted task",
        taskStatus,
        logs: [log],
        totalSeconds: durationSeconds,
        latestStartedAt: log.started_at,
        hasActiveLog: isActive,
      });
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        logs: [...group.logs].sort(
          (firstLog, secondLog) =>
            new Date(secondLog.started_at).getTime() -
            new Date(firstLog.started_at).getTime(),
        ),
      }))
      .sort(
        (firstGroup, secondGroup) =>
          new Date(secondGroup.latestStartedAt).getTime() -
          new Date(firstGroup.latestStartedAt).getTime(),
      );
  }, [timeLogs, now, taskStatusById]);

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
      showError(
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

  function toggleLogGroup(taskId: string) {
    setExpandedLogTaskIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(taskId)) {
        nextIds.delete(taskId);
      } else {
        nextIds.add(taskId);
      }

      return nextIds;
    });
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
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
      showSuccess("Task created.");
    } catch (caughtError) {
      showError(
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

  async function updateTask(
    taskId: string,
    updates: TaskUpdatePayload,
    successMessage?: string | null,
  ) {
    clearFeedback();
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
      if (successMessage) {
        showSuccess(successMessage);
      }
      return payload.task;
    } catch (caughtError) {
      showError(
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
    task: Task,
  ) {
    event.preventDefault();

    const updates = {
      title: editForm.title,
      description: editForm.description.trim() ? editForm.description : null,
      status: editForm.status,
    };

    if (editForm.status === "completed" && activeLog?.task_id === task.id) {
      const shouldStopTimer = window.confirm(
        "This task has a running timer. Completing it will stop the timer and save the current session.",
      );

      if (!shouldStopTimer) {
        return;
      }

      const stoppedLog = await stopTimerForTask(task, null);

      if (!stoppedLog) {
        return;
      }
    }

    const updatedTask = await updateTask(
      task.id,
      updates,
      editForm.status === "completed" && task.status !== "completed"
        ? "Task completed."
        : "Task updated.",
    );

    if (updatedTask) {
      setEditingId(null);
    }
  }

  async function handleStatusChange(
    task: Task,
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const status = event.target.value as TaskStatus;

    if (status === task.status) {
      return;
    }

    if (status === "completed" && activeLog?.task_id === task.id) {
      const shouldStopTimer = window.confirm(
        "This task has a running timer. Completing it will stop the timer and save the current session.",
      );

      if (!shouldStopTimer) {
        return;
      }

      const stoppedLog = await stopTimerForTask(task, null);

      if (!stoppedLog) {
        return;
      }

      await updateTask(task.id, { status }, "Task completed.");
      return;
    }

    await updateTask(
      task.id,
      { status },
      status === "completed" ? "Task completed." : "Task updated.",
    );
  }

  async function handleDeleteTask(task: Task) {
    if (deletingTaskIdsRef.current.has(task.id)) {
      return;
    }

    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    clearFeedback();
    deletingTaskIdsRef.current.add(task.id);
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
      showSuccess("Task deleted.");
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        caughtError.status === 404
      ) {
        setTasks((currentTasks) =>
          currentTasks.filter((currentTask) => currentTask.id !== task.id),
        );
        setTimeLogs((currentLogs) =>
          currentLogs.filter((log) => log.task_id !== task.id),
        );
        showSuccess("That task was already deleted. The dashboard was refreshed.");
        void loadDashboardData();
        return;
      }

      showError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete task. Please refresh and try again.",
      );
    } finally {
      deletingTaskIdsRef.current.delete(task.id);
      setDeletingId(null);
    }
  }

  async function handleStartTimer(task: Task) {
    clearFeedback();
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
      showSuccess("Timer started.");
    } catch (caughtError) {
      showError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start timer.",
      );
    } finally {
      setTimerTaskId(null);
    }
  }

  async function stopTimerForTask(
    task: Task,
    successMessage: string | null = "Timer stopped and saved.",
  ) {
    clearFeedback();
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
      if (successMessage) {
        showSuccess(successMessage);
      }
      return payload.time_log;
    } catch (caughtError) {
      showError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to stop timer.",
      );
      return null;
    } finally {
      setTimerTaskId(null);
    }
  }

  async function handleStopTimer(task: Task) {
    await stopTimerForTask(task);
  }

  return (
    <section data-testid="task-manager" className="space-y-8 py-8">
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
              data-testid="task-original-input"
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
                data-testid="task-title-input"
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
                data-testid="task-description-input"
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
              data-testid="task-create-submit"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isCreating ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <p
          role="alert"
          data-testid="feedback-error"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          data-testid="feedback-success"
          className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
        >
          {notice}
        </p>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <TaskCardsSkeleton />
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
              data-testid="task-card"
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              {isEditing ? (
                <form
                  onSubmit={(event) => handleEditSubmit(event, task)}
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
                        data-testid="task-edit-title"
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
                        data-testid="task-edit-status"
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
                      data-testid="task-edit-description"
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
                      data-testid="task-edit-save"
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
                        <h3
                          data-testid="task-title"
                          className="break-words text-lg font-semibold text-slate-950"
                        >
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
                        <p
                          data-testid="task-description"
                          className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600"
                        >
                          {task.description}
                        </p>
                      ) : null}
                    </div>

                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      disabled={isBusy}
                      data-testid="task-status-select"
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
                    <div data-testid="task-completed-time">
                      <p className="font-medium text-slate-500">
                        Completed time
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatDuration(completedSeconds)}
                      </p>
                    </div>
                    <div data-testid="task-current-run">
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
                          data-testid="task-stop-button"
                          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {timerTaskId === task.id ? "Stopping..." : "Stop"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartTimer(task)}
                          disabled={isBusy || isAnotherTaskRunning}
                          data-testid="task-start-button"
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
                        data-testid="task-edit-button"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        disabled={isBusy}
                        data-testid="task-delete-button"
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

      <section
        data-testid="time-logs-section"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-semibold text-slate-950">Time logs</h2>
          <p className="text-sm text-slate-600">
            Stored work sessions for your tasks.
          </p>
        </div>

        {isLoading ? (
          <TimeLogsSkeleton />
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

        {timeLogGroups.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100">
            {timeLogGroups.map((group) => {
              const isExpanded = expandedLogTaskIds.has(group.taskId);

              return (
                <div
                  key={group.taskId}
                  data-testid="time-log-group"
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words text-base font-semibold text-slate-950">
                          {group.taskTitle}
                        </h3>
                        {group.taskStatus ? (
                          <span
                            data-testid="time-log-task-status"
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[group.taskStatus]}`}
                          >
                            {statusLabels[group.taskStatus]}
                          </span>
                        ) : null}
                        {group.hasActiveLog ? (
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.logs.length}{" "}
                        {group.logs.length === 1 ? "session" : "sessions"} -
                        latest {formatDateTime(group.latestStartedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span className="text-sm font-semibold text-slate-950">
                        {formatDuration(group.totalSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleLogGroup(group.taskId)}
                        aria-expanded={isExpanded}
                        data-testid="time-log-toggle"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                      >
                        {isExpanded ? "Hide sessions" : "Show sessions"}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
                      {group.logs.map((log) => {
                        const isActive = log.ended_at === null;
                        const durationSeconds = isActive
                          ? getElapsedSeconds(log.started_at, now)
                          : log.duration_seconds ?? 0;

                        return (
                          <div
                            key={log.id}
                            data-testid="time-log-session"
                            className="grid gap-2 text-sm sm:grid-cols-[1fr_1fr_auto]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-500">
                                Started
                              </p>
                              <p className="mt-1 break-words text-slate-950">
                                {formatDateTime(log.started_at)}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-500">
                                Ended
                              </p>
                              <p className="mt-1 break-words text-slate-950">
                                {log.ended_at
                                  ? formatDateTime(log.ended_at)
                                  : "Active"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-slate-500">
                                Duration
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {formatDuration(durationSeconds)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </section>
  );
}
