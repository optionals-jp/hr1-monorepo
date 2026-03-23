"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Faq } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { faqTargetLabels, faqCategoryLabels } from "@/lib/constants";
import { EditPanel } from "@/components/ui/edit-panel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Pencil, GripVertical, Eye, EyeOff } from "lucide-react";
import { mutate } from "swr";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";

export default function FaqsPage() {
  const { organization } = useOrg();

  const cacheKey = organization ? `faqs-${organization.id}` : null;

  const {
    data: faqs = [],
    isLoading,
    error: faqsError,
    mutate: mutateFaqs,
  } = useQuery<Faq[]>(cacheKey, async () => {
    const { data } = await getSupabase()
      .from("faqs")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("sort_order", { ascending: true });
    return data ?? [];
  });

  // 編集パネル
  const [editOpen, setEditOpen] = useState(false);
  const [editFaq, setEditFaq] = useState<Faq | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // フォーム
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("general");
  const [target, setTarget] = useState<string>("both");

  function openCreate() {
    setEditFaq(null);
    setQuestion("");
    setAnswer("");
    setCategory("general");
    setTarget("both");
    setEditOpen(true);
  }

  function openEdit(faq: Faq) {
    setEditFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category);
    setTarget(faq.target);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!organization || !question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      if (editFaq) {
        await getSupabase()
          .from("faqs")
          .update({
            question: question.trim(),
            answer: answer.trim(),
            category,
            target,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editFaq.id);
      } else {
        const maxOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.sort_order)) + 1 : 0;
        await getSupabase().from("faqs").insert({
          organization_id: organization.id,
          question: question.trim(),
          answer: answer.trim(),
          category,
          target,
          sort_order: maxOrder,
        });
      }
      await mutate(cacheKey);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editFaq) return;
    setDeleting(true);
    try {
      await getSupabase().from("faqs").delete().eq("id", editFaq.id);
      await mutate(cacheKey);
      setEditOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublished(faq: Faq) {
    await getSupabase().from("faqs").update({ is_published: !faq.is_published }).eq("id", faq.id);
    await mutate(cacheKey);
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="FAQ管理"
        description="応募者・社員向けFAQの作成・管理"
        sticky={false}
        action={<Button onClick={openCreate}>FAQを作成</Button>}
      />

      <QueryErrorBanner error={faqsError} onRetry={() => mutateFaqs()} />

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>質問</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>公開</TableHead>
              <TableHead>更新日</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={faqs.length === 0}
              emptyMessage="FAQがありません"
            >
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  </TableCell>
                  <TableCell className="font-medium max-w-sm">
                    <div className="truncate">{faq.question}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {faqCategoryLabels[faq.category] ?? faq.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{faqTargetLabels[faq.target] ?? faq.target}</Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => togglePublished(faq)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {faq.is_published ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(faq.updated_at), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(faq)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editFaq ? "FAQを編集" : "FAQを作成"}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!question.trim() || !answer.trim()}
        onDelete={editFaq ? handleDelete : undefined}
        deleting={deleting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>質問</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="よくある質問を入力"
            />
          </div>
          <div className="space-y-2">
            <Label>回答</Label>
            <MarkdownEditor value={answer} onChange={setAnswer} rows={10} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(faqCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>対象</Label>
              <Select value={target} onValueChange={(v) => v && setTarget(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(faqTargetLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
