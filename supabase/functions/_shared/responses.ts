import { corsHeaders } from "./cors.ts";

/**
 * CORS ヘッダー付きの JSON レスポンスを返す
 */
export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * CORS ヘッダー付きのエラー JSON レスポンスを返す
 */
export function errorResponse(
  message: string,
  status: number,
): Response {
  return jsonResponse({ error: message }, status);
}
