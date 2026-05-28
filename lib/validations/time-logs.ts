import { z } from "zod";
import { TaskIdSchema } from "@/lib/validations/tasks";

export const TimeLogsQuerySchema = z.object({
  task_id: TaskIdSchema.optional(),
});
