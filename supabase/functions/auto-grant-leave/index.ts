import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";

/**
 * 労基法に基づく有給付与日数を計算
 */
function calculateGrantDays(hireDate: string): number {
  const hire = new Date(hireDate);
  const now = new Date();
  const years =
    (now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0.5) return 0;
  if (years < 1.5) return 10;
  if (years < 2.5) return 11;
  if (years < 3.5) return 12;
  if (years < 4.5) return 14;
  if (years < 5.5) return 16;
  if (years < 6.5) return 18;
  return 20;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentYear = new Date().getFullYear();
    const grantDate = `${currentYear}-04-01`;
    const expiryDate = `${currentYear + 2}-03-31`;

    // 全組織の全従業員を取得
    const { data: employees, error: empError } = await supabase
      .from("user_organizations")
      .select(
        "user_id, organization_id, profiles(id, display_name, hire_date, role)"
      )
      .not("profiles.hire_date", "is", null);

    if (empError) throw empError;

    let granted = 0;
    let skipped = 0;
    let carryOverUpdated = 0;
    const errors: string[] = [];

    // 組織ごとにグルーピング
    const orgEmployees = new Map<string, typeof employees>();
    for (const emp of employees ?? []) {
      const profile = emp.profiles as {
        id: string;
        display_name: string | null;
        hire_date: string | null;
        role: string;
      } | null;
      if (!profile || profile.role !== "employee" || !profile.hire_date) {
        skipped++;
        continue;
      }

      const days = calculateGrantDays(profile.hire_date);
      if (days === 0) {
        skipped++;
        continue;
      }

      try {
        // leave_balances に upsert
        const { error: upsertError } = await supabase
          .from("leave_balances")
          .upsert(
            {
              organization_id: emp.organization_id,
              user_id: emp.user_id,
              fiscal_year: currentYear,
              granted_days: days,
              grant_date: grantDate,
              expiry_date: expiryDate,
            },
            {
              onConflict: "user_id,organization_id,fiscal_year",
              ignoreDuplicates: false,
            }
          );

        if (upsertError) {
          errors.push(`${emp.user_id}: ${upsertError.message}`);
          continue;
        }

        // 組織IDを記録（繰越計算用）
        if (!orgEmployees.has(emp.organization_id)) {
          orgEmployees.set(emp.organization_id, []);
        }

        // 通知を作成
        await supabase.from("notifications").insert({
          organization_id: emp.organization_id,
          user_id: emp.user_id,
          type: "general",
          title: "有給休暇が付与されました",
          body: `${currentYear}年度の有給休暇${days}日が付与されました。`,
          is_read: false,
          action_url: "/leave-balance",
        });

        granted++;
      } catch (e) {
        errors.push(`${emp.user_id}: ${String(e)}`);
      }
    }

    // 繰越日数の自動計算（組織ごとに RPC 呼び出し）
    for (const orgId of orgEmployees.keys()) {
      try {
        const { data: carryOverResult, error: coError } = await supabase.rpc(
          "auto_grant_leave_with_carry_over",
          {
            p_organization_id: orgId,
            p_fiscal_year: currentYear,
          }
        );

        if (coError) {
          errors.push(`carry_over(${orgId}): ${coError.message}`);
        } else {
          carryOverUpdated += carryOverResult?.length ?? 0;
        }
      } catch (e) {
        errors.push(`carry_over(${orgId}): ${String(e)}`);
      }
    }

    return jsonResponse({ granted, skipped, carryOverUpdated, errors }, 200);
  } catch (error) {
    console.error("auto-grant-leave error:", error);
    return errorResponse(String(error), 500);
  }
});
