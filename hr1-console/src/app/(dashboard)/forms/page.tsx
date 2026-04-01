"use client";

import { useState } from "react";
import Link from "next/link";
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
import { useToast } from "@/components/ui/toast";
import type { CustomForm } from "@/types/database";
import { useForms, deleteForm } from "@/lib/hooks/use-forms";
import { Badge } from "@/components/ui/badge";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { TableSection } from "@/components/layout/table-section";
import { formTargetLabels } from "@/lib/constants";
import { Trash2 } from "lucide-react";

import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function FormsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: forms = [], isLoading, error: formsError, mutate: mutateForms } = useForms();

  const handleDeleteForm = async (form: CustomForm) => {
    if (!organization) return;
    if (!window.confirm(`「${form.title}」を削除しますか？`)) return;
    setDeletingId(form.id);
    const result = await deleteForm(organization.id, form);
    if (result.success) {
      mutateForms();
      showToast("フォームを削除しました");
    } else {
      showToast(result.error ?? "削除に失敗しました", "error");
    }
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="フォーム管理"
        description="書類選考用フォームの作成・管理"
        sticky={false}
        action={
          <Link href="/forms/new">
            <Button>フォームを作成</Button>
          </Link>
        }
      />

      <QueryErrorBanner error={formsError} onRetry={() => mutateForms()} />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={isLoading}
              isEmpty={forms.length === 0}
              emptyMessage="フォームがありません"
            >
              {forms.map((form) => (
                <TableRow
                  key={form.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/forms/${form.id}`)}
                >
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formTargetLabels[form.target] ?? form.target}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {form.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(form.created_at), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      disabled={deletingId === form.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(form);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
