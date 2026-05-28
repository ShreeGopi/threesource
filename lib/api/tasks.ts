import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Task } from "@/lib/types/database";

export async function getOwnedTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
  userId: string,
): Promise<{ task: Task | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    task: data,
    error,
  };
}
