"use client";

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
import { useFaqs, useFaqPanel } from "@/lib/hooks/use-faqs";
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
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { TableSection } from "@/components/layout/table-section";

export default function FaqsPage() {
  const { data: faqs = [], isLoading, error: faqsError, mutate: mutateFaqs } = useFaqs();

  const {
    editOpen,
    setEditOpen,
    editFaq,
    saving,
    deleting,
    question,
    setQuestion,
    answer,
    setAnswer,
    category,
    setCategory,
    target,
    setTarget,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    handleTogglePublished,
  } = useFaqPanel();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="FAQ管理"
        description="応募者・社員向けFAQの作成・管理"
        sticky={false}
        action={<Button onClick={openCreate}>FAQを作成</Button>}
      />

      <QueryErrorBanner error={faqsError} onRetry={() => mutateFaqs()} />

      <TableSection>
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
                      onClick={() => handleTogglePublished(faq)}
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
      </TableSection>

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
