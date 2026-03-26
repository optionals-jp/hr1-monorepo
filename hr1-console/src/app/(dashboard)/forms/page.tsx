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
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import { useToast } from "@/components/ui/toast";
import type { CustomForm } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { formTargetLabels } from "@/lib/constants";
import { Trash2 } from "lucide-react";

import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function FormsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: forms = [],
    isLoading,
    error: formsError,
    mutate: mutateForms,
  } = useQuery<CustomForm[]>(organization ? `forms-${organization.id}` : null, async () => {
    const { data } = await getSupabase()
      .from("custom_forms")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

  const handleDeleteForm = async (form: CustomForm) => {
    if (!organization) return;
    if (!window.confirm(`「${form.title}」を削除しますか？`)) return;
    setDeletingId(form.id);
    try {
      const { count } = await getSupabase()
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id);
      if (count && count > 0) {
        showToast(`このフォームには${count}件の回答があるため削除できません`, "error");
        return;
      }
      await getSupabase().from("form_fields").delete().eq("form_id", form.id);
      const { error } = await getSupabase()
        .from("custom_forms")
        .delete()
        .eq("id", form.id)
        .eq("organization_id", organization.id);
      if (error) throw error;
      mutateForms();
      showToast("フォームを削除しました");
    } catch {
      showToast("削除に失敗しました", "error");
    } finally {
      setDeletingId(null);
    }
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

      <div className="bg-white">
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
      </div>
    </div>
  );
}
