export type TaskStatus = "pending" | "in_progress" | "completed";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  original_input: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  original_input?: string | null;
  status?: TaskStatus;
  created_at?: string;
  updated_at?: string;
};

export type TaskUpdate = Partial<
  Pick<
    Task,
    "title" | "description" | "original_input" | "status" | "updated_at"
  >
>;

export type TimeLog = {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export type TimeLogWithTask = TimeLog & {
  tasks: {
    status: TaskStatus;
    title: string;
  } | null;
};

export type TimeLogInsert = {
  id?: string;
  user_id: string;
  task_id: string;
  started_at?: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  created_at?: string;
};

export type TimeLogUpdate = Partial<
  Pick<TimeLog, "task_id" | "started_at" | "ended_at" | "duration_seconds">
>;

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      time_logs: {
        Row: TimeLog;
        Insert: TimeLogInsert;
        Update: TimeLogUpdate;
        Relationships: [
          {
            foreignKeyName: "time_logs_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      task_status: TaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
