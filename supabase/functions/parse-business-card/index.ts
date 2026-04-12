import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/responses.ts";

const MAX_RAW_TEXT_LENGTH = 10000;
const CLAUDE_API_TIMEOUT_MS = 30000;

interface ParsedBusinessCard {
  company_name: string | null;
  company_name_kana: string | null;
  corporate_number: string | null;
  department: string | null;
  position: string | null;
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  postal_code: string | null;
  address: string | null;
  website: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // JWT認証
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "認証が必要です" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ユーザー認証確認
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "認証に失敗しました" }, 401);
    }

    const { raw_text } = await req.json();

    if (!raw_text || typeof raw_text !== "string") {
      return jsonResponse({ error: "raw_text が必要です" }, 400);
    }

    if (raw_text.length > MAX_RAW_TEXT_LENGTH) {
      return jsonResponse(
        {
          error: `raw_text が長すぎます（最大${MAX_RAW_TEXT_LENGTH}文字）`,
        },
        400
      );
    }

    // Claude APIで構造化データ抽出
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return jsonResponse(
        { error: "ANTHROPIC_API_KEY が設定されていません" },
        500
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CLAUDE_API_TIMEOUT_MS
    );

    let claudeResponse: Response;
    try {
      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `以下は名刺をOCRで読み取ったテキストです。このテキストから名刺の情報を構造化してJSON形式で抽出してください。

OCRテキスト:
${raw_text}

以下のJSON形式で返してください。該当する情報がない場合はnullを設定してください。
JSONのみを返し、他のテキストは含めないでください。

{
  "company_name": "会社名",
  "company_name_kana": "会社名カナ（推測できる場合）",
  "corporate_number": "法人番号（13桁の数字、記載されている場合のみ）",
  "department": "部署名",
  "position": "役職",
  "last_name": "姓",
  "first_name": "名",
  "last_name_kana": "姓カナ（推測できる場合）",
  "first_name_kana": "名カナ（推測できる場合）",
  "email": "メールアドレス",
  "phone": "電話番号（固定電話）",
  "mobile_phone": "携帯電話番号",
  "postal_code": "郵便番号",
  "address": "住所",
  "website": "Webサイト"
}`,
            },
          ],
        }),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return jsonResponse({ error: "解析がタイムアウトしました" }, 504);
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!claudeResponse.ok) {
      const status = claudeResponse.status;
      console.error(
        "Claude API error:",
        status,
        await claudeResponse.text()
      );

      if (status === 429) {
        return jsonResponse(
          { error: "APIレート制限に達しました。しばらくしてからお試しください" },
          429
        );
      }
      if (status === 401) {
        return jsonResponse(
          { error: "API認証に失敗しました" },
          500
        );
      }
      return jsonResponse({ error: "名刺の解析に失敗しました" }, 500);
    }

    const claudeResult = await claudeResponse.json();
    const assistantMessage = claudeResult.content?.[0]?.text ?? "";

    // JSONを抽出（コードブロックで囲まれている可能性を考慮）
    let jsonStr = assistantMessage.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: ParsedBusinessCard;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("JSON parse error:", jsonStr);
      return jsonResponse(
        { error: "解析結果のパースに失敗しました" },
        500
      );
    }

    return jsonResponse(parsed as unknown as Record<string, unknown>, 200);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "予期しないエラーが発生しました" }, 500);
  }
});
