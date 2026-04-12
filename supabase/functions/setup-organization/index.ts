import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";

interface SetupOrganizationRequest {
  // 企業情報
  organization_name: string;
  industry?: string;
  location?: string;
  website_url?: string;
  // 契約情報
  plan_id: string;
  contracted_employees: number;
  monthly_price: number;
  status: "active" | "trial";
  trial_end_date?: string;
  notes?: string;
  // 初期管理者
  admin_email: string;
  admin_display_name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // JWT から hr1_admin ロールを検証
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("認証が必要です", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 呼び出し元ユーザーの検証
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return errorResponse("認証に失敗しました", 401);
    }

    // hr1_admin ロールチェック
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "hr1_admin") {
      return errorResponse("HR1管理者権限が必要です", 403);
    }

    const body: SetupOrganizationRequest = await req.json();

    // バリデーション
    if (!body.organization_name || !body.plan_id || !body.admin_email) {
      return errorResponse("organization_name, plan_id, admin_email は必須です", 400);
    }
    if (!body.contracted_employees || body.contracted_employees <= 0) {
      return errorResponse("契約社員数は1以上を指定してください", 400);
    }

    // 1. 企業を作成
    const orgId = crypto.randomUUID();
    const { error: orgError } = await adminClient.from("organizations").insert({
      id: orgId,
      name: body.organization_name,
      industry: body.industry ?? null,
      location: body.location ?? null,
      website_url: body.website_url ?? null,
    });

    if (orgError) {
      return errorResponse(`企業作成に失敗しました: ${orgError.message}`, 500);
    }

    // 2. 契約を作成
    const { error: contractError } = await adminClient.from("contracts").insert({
      organization_id: orgId,
      plan_id: body.plan_id,
      contracted_employees: body.contracted_employees,
      monthly_price: body.monthly_price ?? 0,
      status: body.status ?? "trial",
      start_date: new Date().toISOString().split("T")[0],
      trial_end_date: body.trial_end_date ?? null,
      notes: body.notes ?? null,
    });

    if (contractError) {
      // ロールバック: 企業を削除
      await adminClient.from("organizations").delete().eq("id", orgId);
      return errorResponse(`契約作成に失敗しました: ${contractError.message}`, 500);
    }

    // 3. 管理者ユーザーを招待メール付きで作成
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(body.admin_email, {
        data: {
          display_name: body.admin_display_name ?? null,
          role: "admin",
        },
      });

    if (inviteError) {
      // ロールバック: 契約と企業を削除
      await adminClient.from("contracts").delete().eq("organization_id", orgId);
      await adminClient.from("organizations").delete().eq("id", orgId);

      const msg = /already been registered|already exists/i.test(inviteError.message)
        ? "このメールアドレスは既に登録されています"
        : inviteError.message;
      return errorResponse(`管理者招待に失敗しました: ${msg}`, 400);
    }

    const userId = inviteData.user.id;

    // 4. profiles + user_organizations を作成
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      email: body.admin_email,
      display_name: body.admin_display_name ?? null,
      role: "admin",
    });

    if (profileError) {
      // ロールバック
      await adminClient.auth.admin.deleteUser(userId);
      await adminClient.from("contracts").delete().eq("organization_id", orgId);
      await adminClient.from("organizations").delete().eq("id", orgId);
      return errorResponse(`プロフィール作成に失敗しました: ${profileError.message}`, 500);
    }

    const { error: uoError } = await adminClient.from("user_organizations").insert({
      user_id: userId,
      organization_id: orgId,
    });

    if (uoError) {
      // ロールバック
      await adminClient.from("profiles").delete().eq("id", userId);
      await adminClient.auth.admin.deleteUser(userId);
      await adminClient.from("contracts").delete().eq("organization_id", orgId);
      await adminClient.from("organizations").delete().eq("id", orgId);
      return errorResponse(`組織紐付けに失敗しました: ${uoError.message}`, 500);
    }

    // 5. 契約変更履歴を記録
    await adminClient.from("contract_changes").insert({
      contract_id: (await adminClient.from("contracts").select("id").eq("organization_id", orgId).single()).data?.id,
      changed_by: caller.id,
      change_type: "created",
      new_values: { organization_name: body.organization_name, plan_id: body.plan_id },
      notes: "新規企業セットアップ",
    });

    return jsonResponse({
      organization_id: orgId,
      admin_user_id: userId,
      admin_email: body.admin_email,
      invite_sent: true,
    }, 201);
  } catch (err) {
    console.error("setup-organization error:", err);
    return errorResponse("内部エラーが発生しました", 500);
  }
});
