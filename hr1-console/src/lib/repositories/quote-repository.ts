import type { SupabaseClient } from "@supabase/supabase-js";
import type { BcQuote, BcQuoteItem } from "@/types/database";

export async function fetchQuotes(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("bc_quotes")
    .select("*, bc_companies(name), bc_contacts(last_name, first_name), bc_deals:deal_id(title)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcQuote[];
}

export async function fetchQuotesByDeal(
  client: SupabaseClient,
  dealId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("bc_quotes")
    .select("*, bc_companies(name), bc_contacts(last_name, first_name)")
    .eq("deal_id", dealId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BcQuote[];
}

export async function fetchQuote(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("bc_quotes")
    .select(
      "*, bc_companies(name), bc_contacts(last_name, first_name), bc_deals:deal_id(title), bc_quote_items(*)"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  // 明細をsort_order順にソート
  if (data?.bc_quote_items) {
    data.bc_quote_items.sort((a: BcQuoteItem, b: BcQuoteItem) => a.sort_order - b.sort_order);
  }
  return data as BcQuote;
}

export async function createQuote(
  client: SupabaseClient,
  data: {
    organization_id: string;
    deal_id?: string | null;
    company_id?: string | null;
    contact_id?: string | null;
    quote_number: string;
    title: string;
    issue_date?: string;
    expiry_date?: string | null;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes?: string | null;
    terms?: string | null;
    created_by?: string | null;
  }
) {
  const { data: result, error } = await client.from("bc_quotes").insert(data).select().single();
  if (error) throw error;
  return result as BcQuote;
}

export async function updateQuote(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<
    Pick<
      BcQuote,
      | "title"
      | "deal_id"
      | "company_id"
      | "contact_id"
      | "status"
      | "issue_date"
      | "expiry_date"
      | "subtotal"
      | "tax_rate"
      | "tax_amount"
      | "total"
      | "notes"
      | "terms"
    >
  >
) {
  const { error } = await client
    .from("bc_quotes")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteQuote(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("bc_quotes")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

// --- Quote Items ---

export async function syncQuoteItems(
  client: SupabaseClient,
  quoteId: string,
  organizationId: string,
  items: {
    sort_order: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }[]
) {
  // 0. 見積が当該テナントに属するか検証
  const { data: quote, error: quoteErr } = await client
    .from("bc_quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("organization_id", organizationId)
    .single();
  if (quoteErr || !quote) throw quoteErr ?? new Error("見積書が見つかりません");

  // 1. 既存明細IDを取得
  const { data: existing, error: fetchErr } = await client
    .from("bc_quote_items")
    .select("id")
    .eq("quote_id", quoteId);
  if (fetchErr) throw fetchErr;
  const existingIds = new Set((existing ?? []).map((e: { id: string }) => e.id));

  // 2. 新しい明細を挿入
  if (items.length > 0) {
    const rows = items.map((item) => ({
      quote_id: quoteId,
      sort_order: item.sort_order,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      amount: item.amount,
    }));
    const { error: insertErr } = await client.from("bc_quote_items").insert(rows);
    if (insertErr) throw insertErr;
  }

  // 3. 挿入成功後に旧明細を削除（データ消失リスクを排除）
  if (existingIds.size > 0) {
    const { error: deleteErr } = await client
      .from("bc_quote_items")
      .delete()
      .in("id", Array.from(existingIds));
    if (deleteErr) throw deleteErr;
  }
}

/**
 * 次の見積番号を生成（組織内で連番）
 */
export async function generateQuoteNumber(
  client: SupabaseClient,
  organizationId: string
): Promise<string> {
  const { count, error } = await client
    .from("bc_quotes")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (error) throw error;
  const num = (count ?? 0) + 1;
  return `Q-${String(num).padStart(5, "0")}`;
}
