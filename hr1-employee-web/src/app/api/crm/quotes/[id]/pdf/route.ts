import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 見積書PDF生成 API Route Handler
 * GET /api/crm/quotes/[id]/pdf
 *
 * サーバーサイドでHTML→PDF変換し、日本のB2B商習慣に沿った見積書を生成する。
 * クライアントバンドルを膨らませないためにRoute Handlerで実装。
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createSupabaseServerClient();

  // 認証チェック
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 見積書データ取得
  const { data: quote, error } = await client
    .from("crm_quotes")
    .select(
      "*, crm_companies(name, address, phone), crm_contacts(last_name, first_name), crm_quote_items(*)"
    )
    .eq("id", id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // 発行元組織情報を取得
  const { data: org } = await client
    .from("organizations")
    .select("name, location, website_url, logo_url")
    .eq("id", quote.organization_id)
    .single();

  // 明細項目をソート
  const items = ((quote.crm_quote_items as Record<string, unknown>[]) ?? []).sort(
    (a, b) => ((a.sort_order as number) ?? 0) - ((b.sort_order as number) ?? 0)
  );

  const company = quote.crm_companies as {
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  const contact = quote.crm_contacts as { last_name: string; first_name: string | null } | null;
  const contactName = contact ? `${contact.last_name}${contact.first_name ?? ""} 様` : "";

  // 日付フォーマット（和暦対応）
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // 金額フォーマット
  const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;

  // HTML テンプレートで見積書を生成
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>見積書 ${quote.quote_number}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif; font-size: 10pt; color: #333; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .title { font-size: 22pt; font-weight: bold; text-align: center; margin-bottom: 30px; letter-spacing: 8px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .meta-left { width: 48%; }
    .meta-right { width: 48%; text-align: right; }
    .customer-name { font-size: 14pt; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 8px; }
    .company-info { text-align: right; font-size: 9pt; line-height: 1.8; }
    .company-name { font-size: 12pt; font-weight: bold; margin-bottom: 4px; }
    .stamp-area { display: inline-block; width: 60px; height: 60px; border: 1px solid #ccc; border-radius: 50%; text-align: center; line-height: 60px; color: #ccc; font-size: 8pt; margin-top: 8px; }
    .total-box { background: #f8f8f8; border: 2px solid #333; padding: 12px 20px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; font-size: 14pt; }
    .total-label { font-weight: bold; }
    .total-amount { font-size: 18pt; font-weight: bold; }
    .info-row { display: flex; gap: 20px; margin-bottom: 16px; font-size: 9pt; }
    .info-item { }
    .info-label { color: #666; margin-right: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #4a5568; color: white; padding: 8px 12px; text-align: left; font-size: 9pt; font-weight: 500; }
    th.right { text-align: right; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
    td.right { text-align: right; font-variant-numeric: tabular-nums; }
    tr:nth-child(even) { background: #f7fafc; }
    .summary { margin-top: 16px; }
    .summary-row { display: flex; justify-content: flex-end; gap: 40px; padding: 4px 12px; font-size: 10pt; }
    .summary-row.total { font-size: 12pt; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; margin-top: 4px; }
    .notes { margin-top: 24px; padding: 12px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9pt; white-space: pre-wrap; }
    .notes-title { font-weight: bold; margin-bottom: 4px; }
    .terms { margin-top: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9pt; white-space: pre-wrap; }
    .terms-title { font-weight: bold; margin-bottom: 4px; }
    .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #999; }
  </style>
</head>
<body>
  <div class="title">見 積 書</div>

  <div class="meta">
    <div class="meta-left">
      <div class="customer-name">${company?.name ?? ""}${contactName ? `<br><span style="font-size:10pt;font-weight:normal">${contactName}</span>` : ""}</div>
      ${company?.address ? `<div style="font-size:9pt;color:#666">${company.address}</div>` : ""}
    </div>
    <div class="meta-right">
      <div class="company-info">
        <div class="company-name">${org?.name ?? ""}</div>
        ${org?.location ? `<div>${org.location}</div>` : ""}
        ${org?.website_url ? `<div>${org.website_url}</div>` : ""}
        <div class="stamp-area">印</div>
      </div>
    </div>
  </div>

  <div class="total-box">
    <span class="total-label">御見積金額</span>
    <span class="total-amount">${formatYen(quote.total ?? 0)}（税込）</span>
  </div>

  <div class="info-row">
    <div class="info-item"><span class="info-label">見積番号:</span>${quote.quote_number}</div>
    <div class="info-item"><span class="info-label">発行日:</span>${formatDate(quote.issue_date)}</div>
    ${quote.expiry_date ? `<div class="info-item"><span class="info-label">有効期限:</span>${formatDate(quote.expiry_date)}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:5%">No.</th>
        <th>品名・摘要</th>
        <th class="right" style="width:10%">数量</th>
        <th style="width:8%">単位</th>
        <th class="right" style="width:15%">単価</th>
        <th class="right" style="width:15%">金額</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${(item.description as string) ?? ""}</td>
        <td class="right">${item.quantity ?? 1}</td>
        <td>${(item.unit as string) ?? "式"}</td>
        <td class="right">${formatYen((item.unit_price as number) ?? 0)}</td>
        <td class="right">${formatYen((item.amount as number) ?? 0)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>小計</span>
      <span>${formatYen(quote.subtotal ?? 0)}</span>
    </div>
    <div class="summary-row">
      <span>消費税（${quote.tax_rate ?? 10}%）</span>
      <span>${formatYen(quote.tax_amount ?? 0)}</span>
    </div>
    <div class="summary-row total">
      <span>合計金額</span>
      <span>${formatYen(quote.total ?? 0)}</span>
    </div>
  </div>

  ${quote.notes ? `<div class="notes"><div class="notes-title">備考</div>${quote.notes}</div>` : ""}
  ${quote.terms ? `<div class="terms"><div class="terms-title">取引条件</div>${quote.terms}</div>` : ""}

  <div class="footer">本見積書は ${org?.name ?? ""} が発行しました</div>
</body>
</html>`;

  // HTMLとしてレスポンスを返す（ブラウザのPDF印刷機能で変換）
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="quote-${quote.quote_number}.html"`,
    },
  });
}
