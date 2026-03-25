import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(
        JSON.stringify({ error: "認証が必要です" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: "認証に失敗しました" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // hr1_admin ロールチェック
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "hr1_admin") {
      return new Response(
        JSON.stringify({ error: "HR1管理者権限が必要です" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: SetupOrganizationRequest = await req.json();

    // バリデーション
    if (!body.organization_name || !body.plan_id || !body.admin_email) {
      return new Response(
        JSON.stringify({ error: "organization_name, plan_id, admin_email は必須です" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!body.contracted_employees || body.contracted_employees <= 0) {
      return new Response(
        JSON.stringify({ error: "契約社員数は1以上を指定してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: `企業作成に失敗しました: ${orgError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: `契約作成に失敗しました: ${contractError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: `管理者招待に失敗しました: ${msg}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: `プロフィール作成に失敗しました: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: `組織紐付けに失敗しました: ${uoError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. 契約変更履歴を記録
    await adminClient.from("contract_changes").insert({
      contract_id: (await adminClient.from("contracts").select("id").eq("organization_id", orgId).single()).data?.id,
      changed_by: caller.id,
      change_type: "created",
      new_values: { organization_name: body.organization_name, plan_id: body.plan_id },
      notes: "新規企業セットアップ",
    });

    return new Response(
      JSON.stringify({
        organization_id: orgId,
        admin_user_id: userId,
        admin_email: body.admin_email,
        invite_sent: true,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("setup-organization error:", err);
    return new Response(
      JSON.stringify({ error: "内部エラーが発生しました" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
