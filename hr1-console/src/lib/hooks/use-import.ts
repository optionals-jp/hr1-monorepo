"use client";

import { getSupabase } from "@/lib/supabase/browser";
import { SUPABASE_FUNCTIONS } from "@hr1/shared-ui/lib/supabase-functions";

export async function invokeCreateUser(body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke(SUPABASE_FUNCTIONS.CREATE_USER, {
    body,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
