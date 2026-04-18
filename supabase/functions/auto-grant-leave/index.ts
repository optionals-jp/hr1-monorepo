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

/**
 * HR-28: 認証方式を判定する。
 * - `service_role`: cron/DB トリガー等、全組織一括実行が許可される。
 * - `authenticated` かつ profiles.role = 'hr1_admin': 指定した 1 組織のみ実行可。
 *   呼び出し時に body.organization_id が必須。
 */
type AuthContext =
  | { kind: "service_role" }
  | { kind: "hr1_admin"; userId: string; organizationId: string };

function decodeJwt(authHeader: string | null): Record<string, unknown> | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
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

    // HR-28: 認証チェック
    const jwt = decodeJwt(req.headers.get("Authorization"));
    if (!jwt) {
      return errorResponse("Unauthorized: missing or malformed JWT", 401);
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let auth: AuthContext;
    const role = typeof jwt.role === "string" ? jwt.role : "";
    if (role === "service_role") {
      auth = { kind: "service_role" };
    } else if (role === "authenticated") {
      const userId = typeof jwt.sub === "string" ? jwt.sub : null;
      if (!userId) {
        return errorResponse("Unauthorized: no sub claim", 401);
      }
      // hr1_admin ロールを profiles から検証
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (profileError || !profile || profile.role !== "hr1_admin") {
        return errorResponse("Forbidden: hr1_admin role required", 403);
      }
      const organizationId = typeof body.organization_id === "string"
        ? body.organization_id
        : null;
      if (!organizationId) {
        return errorResponse(
          "Bad Request: organization_id is required for hr1_admin",
          400
        );
      }
      auth = { kind: "hr1_admin", userId, organizationId };
    } else {
      return errorResponse("Forbidden: unsupported role", 403);
    }

    // 操作ログ (HR-28: audit_logs は CHECK 制約/schema 制約があるため stdout に出力)
    console.log(
      JSON.stringify({
        event: "auto_grant_leave.invoke",
        auth: auth.kind,
        actor: auth.kind === "hr1_admin" ? auth.userId : null,
        target_org: auth.kind === "hr1_admin" ? auth.organizationId : "*",
        at: new Date().toISOString(),
      })
    );

    const currentYear = new Date().getFullYear();
    const grantDate = `${currentYear}-04-01`;
    const expiryDate = `${currentYear + 2}-03-31`;

    // 対象従業員の取得: service_role は全組織、hr1_admin は指定組織のみ
    let query = supabase
      .from("user_organizations")
      .select(
        "user_id, organization_id, profiles(id, display_name, hire_date, role)"
      )
      .not("profiles.hire_date", "is", null);

    if (auth.kind === "hr1_admin") {
      query = query.eq("organization_id", auth.organizationId);
    }

    const { data: employees, error: empError } = await query;
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
