import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  create,
  getNumericDate,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Firebase サービスアカウント JSON（環境変数に設定）
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}"
);

interface PushPayload {
  user_id: string;
  title: string;
  body?: string;
  action_url?: string;
  data?: Record<string, string>;
}

/**
 * PEM 形式の秘密鍵から CryptoKey を生成
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Google OAuth2 アクセストークンを取得
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPrivateKey(FIREBASE_SERVICE_ACCOUNT.private_key);

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: FIREBASE_SERVICE_ACCOUNT.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    key
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const result = await response.json();
  if (!result.access_token) {
    throw new Error(`OAuth2 トークン取得失敗: ${JSON.stringify(result)}`);
  }
  return result.access_token;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: PushPayload = await req.json();
    const { user_id, title, body, action_url, data } = payload;

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!FIREBASE_SERVICE_ACCOUNT.project_id) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supabase クライアント（service_role で全トークン取得）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ユーザーの FCM トークンを取得
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", user_id);

    if (error) {
      return new Response(
        JSON.stringify({ error: `トークン取得エラー: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found for user", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // OAuth2 アクセストークン取得
    const accessToken = await getAccessToken();
    const projectId = FIREBASE_SERVICE_ACCOUNT.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // FCM HTTP v1 API で送信
    const results = await Promise.allSettled(
      tokens.map(async ({ token }: { token: string }) => {
        const response = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title,
                body: body ?? "",
              },
              data: {
                action_url: action_url ?? "",
                ...(data ?? {}),
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                    badge: 1,
                  },
                },
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  channel_id: "hr1_notifications",
                },
              },
            },
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          // 無効なトークンを削除
          if (
            result?.error?.code === 404 ||
            result?.error?.details?.some(
              (d: { errorCode: string }) =>
                d.errorCode === "UNREGISTERED"
            )
          ) {
            await supabase
              .from("push_tokens")
              .delete()
              .eq("token", token);
          }
          throw new Error(JSON.stringify(result.error));
        }
        return result;
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason?.message ?? String(r.reason));

    return new Response(
      JSON.stringify({ sent, failed, total: tokens.length, errors }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Internal error: ${(err as Error).message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
