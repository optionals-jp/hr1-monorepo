import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // JWT認証
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "認証が必要です" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "認証に失敗しました" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { raw_text } = await req.json();

    if (!raw_text || typeof raw_text !== "string") {
      return new Response(
        JSON.stringify({ error: "raw_text が必要です" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Claude APIで構造化データ抽出
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY が設定されていません" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
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
      }
    );

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", errorText);
      return new Response(
        JSON.stringify({ error: "名刺の解析に失敗しました" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({
          error: "解析結果のパースに失敗しました",
          raw_response: assistantMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "予期しないエラーが発生しました" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
