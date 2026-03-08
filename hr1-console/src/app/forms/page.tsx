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
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { CustomForm } from "@/types/database";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function FormsPage() {
  const router = useRouter();
  const { organization } = useOrg();

  const { data: forms = [], isLoading } = useQuery<CustomForm[]>(
    organization ? `forms-${organization.id}` : null,
    async () => {
      const { data } = await supabase
        .from("custom_forms")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="フォーム管理"
        description="書類選考用フォームの作成・管理"
        action={
          <Link href="/forms/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              フォームを作成
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイトル</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>作成日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    フォームがありません
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((form) => (
                  <TableRow
                    key={form.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/forms/${form.id}`)}
                  >
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {form.description ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(form.created_at), "yyyy/MM/dd")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
