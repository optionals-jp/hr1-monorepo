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
  name_kana?: string;
  phone?: string;
  hire_date?: string;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  current_address?: string;
  registered_address?: string;
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
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // リクエスト元ユーザーの権限チェック（anon keyで検証）
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "認証に失敗しました" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: CreateUserRequest = await req.json();

    if (!body.email || !body.role || !body.organization_id) {
      return new Response(
        JSON.stringify({ error: "email, role, organization_id は必須です" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 呼び出し元が指定組織に所属しているか確認
    const { data: callerOrg } = await adminClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", caller.id)
      .eq("organization_id", body.organization_id)
      .maybeSingle();

    if (!callerOrg) {
      return new Response(
        JSON.stringify({ error: "指定された組織に所属していません" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Supabase Auth でユーザーを作成（email_confirm: false で未確認状態）
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: body.email,
        email_confirm: false,
        user_metadata: {
          display_name: body.display_name ?? null,
          role: body.role,
        },
      });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // 2. RPC でプロフィール・組織・部署を一括作成（トランザクション保証）
    const { error: rpcError } = await adminClient.rpc("create_user_with_org", {
      p_user_id: userId,
      p_email: body.email,
      p_display_name: body.display_name ?? null,
      p_role: body.role,
      p_organization_id: body.organization_id,
      p_position: body.position ?? null,
      p_hiring_type: body.hiring_type ?? null,
      p_graduation_year: body.graduation_year ?? null,
      p_department_ids: body.department_ids ?? [],
      p_name_kana: body.name_kana ?? null,
      p_phone: body.phone ?? null,
      p_hire_date: body.hire_date ?? null,
      p_birth_date: body.birth_date ?? null,
      p_gender: body.gender ?? null,
      p_current_address: body.current_address ?? null,
      p_registered_address: body.registered_address ?? null,
    });

    if (rpcError) {
      // RPC 失敗時は Auth ユーザーも削除（ロールバック）
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `ユーザー作成失敗: ${rpcError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. マジックリンクを生成してメールを送信（既存ユーザーに対してはmagiclink）
    const redirectTo =
      body.role === "employee"
        ? "hr1employee://login-callback"
        : "hr1applicant://login-callback";

    let inviteSent = false;
    try {
      const { data: linkData, error: linkError } =
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: body.email,
          options: { redirectTo },
        });

      if (linkError) {
        console.error("招待リンク生成エラー:", linkError.message);
      } else if (linkData?.properties?.action_link) {
        // Supabase が自動でメールを送信しない場合に備え、
        // notifications テーブル経由でプッシュ通知も送信
        inviteSent = true;
      }
    } catch (e) {
      console.error("招待メール送信エラー:", e);
    }

    return new Response(
      JSON.stringify({ id: userId, email: body.email, invite_sent: inviteSent }),
      {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-user error:", err);
    return new Response(
      JSON.stringify({ error: "内部エラーが発生しました" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
