import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
]);

const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

const nullableTextSchema = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

export const CreateTaskSchema = z
  .object({
    original_input: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value.length > 0, {
        message: "Task input is required.",
      }),
    title: optionalTextSchema(160),
    description: optionalTextSchema(2000),
    status: TaskStatusSchema.optional(),
  })
  .strict();

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: nullableTextSchema(2000),
    original_input: nullableTextSchema(500),
    status: TaskStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one task field is required.",
  });

export const TaskIdSchema = z.string().uuid();
