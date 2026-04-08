"use client";

import { getSupabase, assertNotUnauthorized } from "@/lib/supabase/browser";

export async function invokeCreateUser(body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke("create-user", { body });
  if (error) assertNotUnauthorized(error);
  if (data?.error) throw new Error(data.error);
  return data;
}
