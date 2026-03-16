import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  display_name?: string;
  role: "employee" | "applicant";
  organization_id: string;
  position?: string;
  hiring_type?: "new_grad" | "mid_career";
  graduation_year?: number;
  department_ids?: string[];
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // リクエストのJWTからユーザーを検証（adminロールのみ許可）
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "認証が必要です" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // リクエスト元ユーザーの権限チェック（anon keyで検証）
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } =
      await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "認証に失敗しました" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 呼び出し元がadminロールか確認
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "管理者権限が必要です" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateUserRequest = await req.json();

    if (!body.email || !body.role || !body.organization_id) {
      return new Response(
        JSON.stringify({ error: "email, role, organization_id は必須です" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Supabase Auth でユーザーを作成
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        user_metadata: {
          display_name: body.display_name ?? null,
          role: body.role,
        },
      });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 2. profiles テーブルにプロフィールを作成
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: userId,
        email: body.email,
        display_name: body.display_name ?? null,
        role: body.role,
        position: body.position ?? null,
        hiring_type: body.hiring_type ?? null,
        graduation_year: body.graduation_year ?? null,
      });

    if (profileError) {
      // プロフィール作成失敗時はAuthユーザーも削除（ロールバック）
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `プロフィール作成失敗: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. user_organizations にリンク
    const { error: orgError } = await adminClient
      .from("user_organizations")
      .insert({
        user_id: userId,
        organization_id: body.organization_id,
      });

    if (orgError) {
      // ロールバック
      await adminClient.from("profiles").delete().eq("id", userId);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `組織紐付け失敗: ${orgError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. 部署割り当て（指定がある場合）
    if (body.department_ids && body.department_ids.length > 0) {
      const { error: deptError } = await adminClient
        .from("employee_departments")
        .insert(
          body.department_ids.map((deptId) => ({
            user_id: userId,
            department_id: deptId,
          }))
        );

      if (deptError) {
        console.error("部署割り当てエラー（ユーザーは作成済み）:", deptError.message);
      }
    }

    return new Response(
      JSON.stringify({ id: userId, email: body.email }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-user error:", err);
    return new Response(
      JSON.stringify({ error: "内部エラーが発生しました" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
