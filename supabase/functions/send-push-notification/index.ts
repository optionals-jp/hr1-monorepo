import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  create,
  getNumericDate,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { timingSafeEqual } from "jsr:@std/crypto/timing-safe-equal";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Firebase サービスアカウント JSON（環境変数に設定）
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}"
);

// HR-28 follow-up: service_role Bearer の SHA-256 ダイジェストを事前計算。
// 以降の認証チェックは全て 32 バイト固定長 (SHA-256 出力) 同士の timingSafeEqual
// で判定する。これにより (a) JWT claim 偽造を通さない、(b) 長さ観測サイド
// チャネルを閉じる、の 2 点を同時に解決する。
// ローテーション運用: 単一 key 前提。Supabase Dashboard で rotate した場合、
// Edge Functions の環境変数が反映されるまで 1-2 分のダウンタイム許容。
const SERVICE_ROLE_KEY_DIGEST: Uint8Array = new Uint8Array(
  await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY)
  )
);

interface PushPayload {
  user_id: string;
  title: string;
  body?: string;
  action_url?: string;
  data?: Record<string, string>;
}

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
    // HR-28 follow-up: Authorization ヘッダ欠損なら即 401（フェイルクローズ）
    const bearer = extractBearer(req);
    if (!bearer) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    // HR-28 follow-up: SHA-256 digest 自体が入力長に応じたブロック数差で時間差を
    // 生むため、過大 bearer は事前に拒否する。通常の service_role JWT は
    // 1000 バイト未満。
    if (bearer.length > 4096) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    // HR-28 follow-up: service_role key と定数時間比較。JWT claim 偽造を
    // 許さない（gateway の verify_jwt=true に依らず安全）。
    if (!(await isServiceRole(bearer))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: service role token required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

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
            // HR-28: user_id + token の複合スコープで削除。
            await supabase
              .from("push_tokens")
              .delete()
              .eq("user_id", user_id)
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
