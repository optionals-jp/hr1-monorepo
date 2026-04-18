import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type SupabaseClient,
} from "jsr:@supabase/supabase-js@2";
import { timingSafeEqual } from "jsr:@std/crypto/timing-safe-equal";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// HR-28 follow-up: service_role Bearer の SHA-256 ダイジェストを事前計算。
// 以降の認証チェックは全て 32 バイト固定長 (SHA-256 出力) 同士の timingSafeEqual
// で判定する。これにより (a) JWT claim 偽造を通さない、(b) 長さ観測サイド
// チャネルを閉じる、の 2 点を同時に解決する。
const SERVICE_ROLE_KEY_DIGEST: Uint8Array = new Uint8Array(
  await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY)
  )
);

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
 * HR-28 follow-up: 認証方式を判定する。
 * - `service_role`: cron/DB トリガー等、全組織一括実行が許可される。
 * - `hr1_admin`: 指定した 1 組織のみ実行可。profiles.role = 'hr1_admin'。
 * - `tenant_admin`: 指定した 1 組織のみ実行可。profiles.role = 'admin' かつ
 *   user_organizations で当該組織に所属している場合。
 * いずれも body.organization_id を要求する（service_role を除く）。
 */
type AuthContext =
  | { kind: "service_role" }
  | { kind: "hr1_admin"; userId: string; organizationId: string }
  | { kind: "tenant_admin"; userId: string; organizationId: string };

type AuthOk = { auth: AuthContext; body: Record<string, unknown> };

function extractBearer(req: Request): string | null {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/**
 * HR-28 follow-up: Bearer トークンが service_role key と一致するかを
 * 定数時間で検査する。SHA-256 で両辺を 32 バイトに正規化してから比較するため、
 * 入力長の差から key 長を推定するサイドチャネルを塞ぐ。
 */
async function isServiceRole(bearer: string): Promise<boolean> {
  const incoming = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bearer))
  );
  return timingSafeEqual(incoming, SERVICE_ROLE_KEY_DIGEST);
}

/**
 * HR-28 follow-up: Bearer トークンから AuthContext を決定する。
 * - (1) service_role は SHA-256 + timingSafeEqual の定数時間比較。
 * - (2) それ以外は supabase.auth.getUser(bearer) で user.id を権威化。
 *   ネットワーク/署名検証失敗時は 401 フェイルクローズ。
 * - (3) profiles.role を user.id で lookup。
 * - (4) tenant_admin は user_organizations で所属を二段検証。
 * body パースは本関数内で 1 度だけ行い、呼び出し側に返す。
 */
async function resolveAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthOk | Response> {
  const bearer = extractBearer(req);
  if (!bearer) {
    return errorResponse("Unauthorized: missing Authorization header", 401);
  }
  // HR-28 follow-up: SHA-256 digest 自体が入力長に応じたブロック数差で時間差を
  // 生むため、過大 bearer は事前に拒否する。
  if (bearer.length > 4096) {
    return errorResponse("Unauthorized", 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // (1) service_role: 定数時間比較
  if (await isServiceRole(bearer)) {
    return { auth: { kind: "service_role" }, body };
  }

  // (2) authenticated: Supabase Auth に問合せて user.id を確定
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(bearer);
  if (authError || !user) {
    return errorResponse("Unauthorized: token verification failed", 401);
  }

  // (3) profiles.role を user.id で lookup
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return errorResponse("Forbidden: profile not found", 403);
  }

  // (4) organization_id 必須
  const organizationId =
    typeof body.organization_id === "string" ? body.organization_id : null;
  if (!organizationId) {
    return errorResponse(
      "Bad Request: organization_id is required",
      400
    );
  }

  if (profile.role === "hr1_admin") {
    return {
      auth: { kind: "hr1_admin", userId: user.id, organizationId },
      body,
    };
  }
  if (profile.role === "admin") {
    // tenant_admin: user_organizations の所属を検証
    const { data: membership, error: memError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (memError || !membership) {
      return errorResponse(
        "Forbidden: not a member of the specified organization",
        403
      );
    }
    return {
      auth: { kind: "tenant_admin", userId: user.id, organizationId },
      body,
    };
  }
  return errorResponse("Forbidden: admin role required", 403);
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // HR-28 follow-up: 認証コンテキスト決定
    const resolved = await resolveAuth(req, supabase);
    if (resolved instanceof Response) {
      return resolved;
    }
    const { auth } = resolved;

    // 操作ログ (HR-28: audit_logs には CHECK 制約/schema 制約があるため stdout に出力)
    console.log(
      JSON.stringify({
        event: "auto_grant_leave.invoke",
        auth: auth.kind,
        actor: auth.kind === "service_role" ? null : auth.userId,
        target_org: auth.kind === "service_role" ? "*" : auth.organizationId,
        at: new Date().toISOString(),
      })
    );

    const currentYear = new Date().getFullYear();
    const grantDate = `${currentYear}-04-01`;
    const expiryDate = `${currentYear + 2}-03-31`;

    // 対象従業員の取得: service_role は全組織、それ以外は指定組織のみ
    let query = supabase
      .from("user_organizations")
      .select(
        "user_id, organization_id, profiles(id, display_name, hire_date, role)"
      )
      .not("profiles.hire_date", "is", null);

    if (auth.kind !== "service_role") {
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
