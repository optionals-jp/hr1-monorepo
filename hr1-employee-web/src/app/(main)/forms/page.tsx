"use client";

import Link from "next/link";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { useForms } from "@/features/recruiting/hooks/use-forms";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { formTargetLabels } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function FormsPage() {
  const router = useRouter();

  const { data: forms = [], isLoading, error: formsError, mutate: mutateForms } = useForms();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="フォーム管理"
        description="書類選考用フォームの作成・管理"
        sticky={false}
        action={
          <Link href="/forms/new">
            <Button variant="primary">フォームを作成</Button>
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
      </TableSection>
    </div>
  );
}
