"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useCrmQuote, useCrmCompanies, useCrmContacts, useCrmDealsAll } from "@/lib/hooks/use-crm";
import { getSupabase } from "@/lib/supabase/browser";
import * as quoteRepo from "@/lib/repositories/quote-repository";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants";
import type {
  BcQuote,
  BcQuoteItem,
  QuoteStatus,
  BcCompany,
  BcContact,
  BcDeal,
} from "@/types/database";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { Save, Trash2, Printer } from "lucide-react";
import { QuoteItemsEditor, emptyItem } from "./quote-items-editor";
import type { EditableItem } from "./quote-items-editor";

function quoteToItems(quote: BcQuote | undefined): EditableItem[] {
  if (!quote?.crm_quote_items?.length) return [emptyItem()];
  return quote.crm_quote_items.map((qi: BcQuoteItem) => ({
    id: qi.id,
    description: qi.description,
    quantity: qi.quantity,
    unit: qi.unit,
    unit_price: qi.unit_price,
    amount: qi.amount,
  }));
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { data: quote, error, mutate } = useCrmQuote(isNew ? "__skip__" : id);
  const { data: companies } = useCrmCompanies();
  const { data: contacts } = useCrmContacts();
  const { data: deals } = useCrmDealsAll();

  // 新規時はすぐにフォームを表示、既存時はデータ到着後にフォームを表示
  if (!isNew && !quote && !error) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="見積書"
          sticky={false}
          border={false}
          breadcrumb={[
            { label: "商談管理", href: "/deals" },
            { label: "見積書一覧", href: "/quotes" },
          ]}
        />
        <p className="text-sm text-muted-foreground text-center py-8">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      {error && <QueryErrorBanner error={error} />}
      <QuoteForm
        key={quote?.id ?? "new"}
        quote={quote}
        isNew={isNew}
        id={id}
        companies={companies ?? []}
        contacts={contacts ?? []}
        deals={deals ?? []}
        mutate={mutate}
      />
    </>
  );
}

function QuoteForm({
  quote,
  isNew,
  id,
  companies,
  contacts,
  deals,
  mutate,
}: {
  quote: BcQuote | undefined;
  isNew: boolean;
  id: string;
  companies: BcCompany[];
  contacts: BcContact[];
  deals: BcDeal[];
  mutate: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const [title, setTitle] = useState(quote?.title ?? "");
  const [dealId, setDealId] = useState(
    quote?.deal_id ?? (isNew ? (searchParams.get("dealId") ?? "") : "")
  );
  const [companyId, setCompanyId] = useState(quote?.company_id ?? "");
  const [contactId, setContactId] = useState(quote?.contact_id ?? "");
  const [status, setStatus] = useState<QuoteStatus>(quote?.status ?? "draft");
  const [issueDate, setIssueDate] = useState(
    quote?.issue_date ?? new Date().toISOString().slice(0, 10)
  );
  const [expiryDate, setExpiryDate] = useState(quote?.expiry_date ?? "");
  const [taxRate, setTaxRate] = useState(quote?.tax_rate ?? 10);
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [terms, setTerms] = useState(quote?.terms ?? "");
  const [items, setItems] = useState<EditableItem[]>(quoteToItems(quote));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.amount, 0), [items]);
  const taxAmount = useMemo(() => Math.floor(subtotal * (taxRate / 100)), [subtotal, taxRate]);
  const total = subtotal + taxAmount;

  const updateItem = useCallback((index: number, field: keyof EditableItem, value: unknown) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.amount = Math.floor(Number(item.quantity) * Number(item.unit_price));
      }
      next[index] = item;
      return next;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return [emptyItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!title.trim()) {
      showToast("タイトルを入力してください", "error");
      return;
    }

    setSaving(true);
    try {
      const quoteData = {
        title: title.trim(),
        deal_id: dealId || null,
        company_id: companyId || null,
        contact_id: contactId || null,
        status,
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
        terms: terms || null,
      };

      const validItems = items
        .filter((i) => i.description.trim())
        .map((i, idx) => ({ ...i, sort_order: idx }));

      if (isNew) {
        const quoteNumber = await quoteRepo.generateQuoteNumber(getSupabase(), organization.id);
        const created = await quoteRepo.createQuote(getSupabase(), {
          ...quoteData,
          organization_id: organization.id,
          quote_number: quoteNumber,
          created_by: user?.id ?? null,
        });
        if (validItems.length > 0) {
          await quoteRepo.syncQuoteItems(getSupabase(), created.id, organization.id, validItems);
        }
        showToast("見積書を作成しました");
        router.push(`/quotes/${created.id}`);
      } else {
        await quoteRepo.updateQuote(getSupabase(), id, organization.id, quoteData);
        await quoteRepo.syncQuoteItems(getSupabase(), id, organization.id, validItems);
        showToast("見積書を更新しました");
        mutate();
      }
    } catch {
      showToast("見積書の保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    organization,
    user,
    title,
    dealId,
    companyId,
    contactId,
    status,
    issueDate,
    expiryDate,
    subtotal,
    taxRate,
    taxAmount,
    total,
    notes,
    terms,
    items,
    isNew,
    id,
    showToast,
    router,
    mutate,
  ]);

  const handleDelete = useCallback(async () => {
    if (!organization || isNew || deleting) return;
    setDeleting(true);
    try {
      await quoteRepo.deleteQuote(getSupabase(), id, organization.id);
      showToast("見積書を削除しました");
      router.push("/quotes");
    } catch {
      showToast("見積書の削除に失敗しました", "error");
    } finally {
      setDeleting(false);
    }
  }, [organization, isNew, deleting, id, showToast, router]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={isNew ? "見積書作成" : `見積書: ${quote?.quote_number ?? ""}`}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "商談管理", href: "/deals" },
          { label: "見積書一覧", href: "/quotes" },
        ]}
        action={
          <div className="flex gap-2">
            {!isNew && (
              <>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="size-4 mr-1.5" />
                  印刷
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleting}
                >
                  <Trash2 className="size-4 mr-1.5" />
                  {deleting ? "削除中..." : "削除"}
                </Button>
              </>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="size-4 mr-1.5" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>タイトル *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="見積書タイトル"
                />
              </div>
              {!isNew && (
                <div>
                  <Label>ステータス</Label>
                  <div className="flex items-center gap-2">
                    <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(quoteStatusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant={quoteStatusColors[status]}>{quoteStatusLabels[status]}</Badge>
                  </div>
                </div>
              )}
              <div>
                <Label>商談</Label>
                <Select value={dealId} onValueChange={(v) => setDealId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="商談を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未選択</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>取引先企業</Label>
                <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="企業を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未選択</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>連絡先</Label>
                <Select value={contactId} onValueChange={(v) => setContactId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="連絡先を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未選択</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.last_name} {c.first_name ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>発行日</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>有効期限</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <Label>消費税率（%）</Label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>
            </div>
          </div>

          <QuoteItemsEditor
            items={items}
            updateItem={updateItem}
            addItem={addItem}
            removeItem={removeItem}
            subtotal={subtotal}
            taxRate={taxRate}
            taxAmount={taxAmount}
            total={total}
          />

          {/* 備考・条件 */}
          <div className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold mb-4">備考・条件</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>備考</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="備考欄"
                  rows={3}
                />
              </div>
              <div>
                <Label>取引条件</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="支払条件、納期等"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      </PageContent>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="見積書の削除"
        description="この見積書を削除しますか？この操作は元に戻せません。"
        variant="destructive"
        confirmLabel="削除"
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          handleDelete();
        }}
        loading={deleting}
      />
    </div>
  );
}
