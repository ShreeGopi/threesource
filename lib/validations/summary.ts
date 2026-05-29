import { z } from "zod";

export const SummaryTodayQuerySchema = z.object({
  timezone_offset_minutes: z.coerce.number().int().min(-840).max(840).default(0),
});
