import { supabase } from "./supabase";

export async function logActivity(userId: string, userName: string, action: string, details: string) {
  try {
    await supabase.from("activity_logs").insert([
      { user_id: userId, user_name: userName, action, details }
    ]);
  } catch (e) {
    console.error("Failed to log activity", e);
  }
}
