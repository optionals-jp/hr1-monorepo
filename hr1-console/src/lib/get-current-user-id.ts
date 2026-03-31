import { getSupabase } from "@/lib/supabase/browser";

export async function getCurrentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("認証ユーザーが取得できません");
  return userId;
}
