import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";

interface CreateUserRequest {
  email: string;
  display_name?: string;
  role: "employee" | "applicant";
  organization_id: string;
  position?: string;
  department_ids?: string[];
  name_kana?: string;
  phone?: string;
  hire_date?: string;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  current_postal_code?: string;
  current_prefecture?: string;
  current_city?: string;
  current_street_address?: string;
  current_building?: string;
  registered_postal_code?: string;
  registered_prefecture?: string;
  registered_city?: string;
  registered_street_address?: string;
  registered_building?: string;
  hiring_type?: "new_grad" | "mid_career";
  graduation_year?: number;
  send_invite?: boolean;
}

function localizeAuthError(message: string): string {
  if (/already been registered|already exists/i.test(message)) {
    return "このメールアドレスは既に登録されています";
  }
  if (/invalid.*email|email.*invalid/i.test(message)) {
    return "有効なメールアドレスを指定してください";
  }
  if (/rate limit/i.test(message)) {
    return "リクエスト回数の上限に達しました。しばらく待ってから再試行してください";
  }
  return message;
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
      return errorResponse("認証が必要です", 401);
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
      return errorResponse("認証に失敗しました", 401);
    }

    // 呼び出し元がadminロールか確認
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return errorResponse("管理者権限が必要です", 403);
    }

    const body: CreateUserRequest = await req.json();

    if (!body.email || !body.role || !body.organization_id) {
      return errorResponse("email, role, organization_id は必須です", 400);
    }

    // 呼び出し元が指定組織に所属しているか確認
    const { data: callerOrg } = await adminClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", caller.id)
      .eq("organization_id", body.organization_id)
      .maybeSingle();

    if (!callerOrg) {
      return errorResponse("指定された組織に所属していません", 403);
    }

    // 1. Supabase Auth でユーザーを作成
    const redirectTo =
      body.role === "employee"
        ? "hr1employee://login-callback"
        : "hr1applicant://login-callback";

    let userId: string;
    let inviteSent = false;

    if (body.send_invite) {
      // 招待メール送信あり: inviteUserByEmail で作成+招待メール送信
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(body.email, {
          data: {
            display_name: body.display_name ?? null,
            role: body.role,
          },
          redirectTo,
        });

      if (inviteError) {
        return errorResponse(localizeAuthError(inviteError.message), 400);
      }

      userId = inviteData.user.id;
      inviteSent = true;
    } else {
      // 招待メールなし: createUser で作成のみ
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
        return errorResponse(localizeAuthError(authError.message), 400);
      }

      userId = authData.user.id;
    }

    // 2. RPC でプロフィール・組織・部署を一括作成（トランザクション保証）
    const { error: rpcError } = await adminClient.rpc("create_user_with_org", {
      p_user_id: userId,
      p_email: body.email,
      p_display_name: body.display_name ?? null,
      p_role: body.role,
      p_organization_id: body.organization_id,
      p_position: body.position ?? null,
      p_department_ids: body.department_ids ?? [],
      p_name_kana: body.name_kana ?? null,
      p_phone: body.phone ?? null,
      p_hire_date: body.hire_date ?? null,
      p_birth_date: body.birth_date ?? null,
      p_gender: body.gender ?? null,
      p_current_postal_code: body.current_postal_code ?? null,
      p_current_prefecture: body.current_prefecture ?? null,
      p_current_city: body.current_city ?? null,
      p_current_street_address: body.current_street_address ?? null,
      p_current_building: body.current_building ?? null,
      p_registered_postal_code: body.registered_postal_code ?? null,
      p_registered_prefecture: body.registered_prefecture ?? null,
      p_registered_city: body.registered_city ?? null,
      p_registered_street_address: body.registered_street_address ?? null,
      p_registered_building: body.registered_building ?? null,
      p_hiring_type: body.hiring_type ?? null,
      p_graduation_year: body.graduation_year ?? null,
    });

    if (rpcError) {
      // RPC 失敗時は Auth ユーザーも削除（ロールバック）
      // Postgres の制約名・カラム名がユーザーに漏れないよう、詳細はログのみに残す
      console.error("create_user_with_org failed:", rpcError);
      await adminClient.auth.admin.deleteUser(userId);
      return errorResponse("ユーザー情報の登録に失敗しました", 500);
    }

    return jsonResponse({ id: userId, email: body.email, invite_sent: inviteSent }, 201);
  } catch (err) {
    console.error("create-user error:", err);
    return errorResponse("内部エラーが発生しました", 500);
  }
});
