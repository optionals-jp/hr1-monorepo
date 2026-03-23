"use client";

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
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { CustomForm } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { formTargetLabels } from "@/lib/constants";

import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function FormsPage() {
  const router = useRouter();
  const { organization } = useOrg();

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
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
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
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
