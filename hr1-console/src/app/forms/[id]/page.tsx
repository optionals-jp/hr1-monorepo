"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import type { CustomForm, FormField, FormResponse } from "@/types/database";
import { format } from "date-fns";

const fieldTypeLabels: Record<string, string> = {
  shortText: "短文テキスト",
  longText: "長文テキスト",
  radio: "ラジオボタン",
  checkbox: "チェックボックス",
  dropdown: "ドロップダウン",
  date: "日付",
  fileUpload: "ファイルアップロード",
};

interface ResponseRow {
  application_id: string;
  applicant_name: string;
  answers: Record<string, string>;
  created_at: string;
}

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [{ data: formData }, { data: fieldsData }, { data: responsesData }] = await Promise.all(
        [
          supabase.from("custom_forms").select("*").eq("id", id).single(),
          supabase.from("form_fields").select("*").eq("form_id", id).order("sort_order"),
          supabase
            .from("form_responses")
            .select(
              "*, applications:application_id(applicant_id, profiles:applicant_id(display_name, email))"
            )
            .eq("form_id", id),
        ]
      );

      setForm(formData);
      setFields(fieldsData ?? []);

      // Group responses by application_id
      const grouped: Record<string, ResponseRow> = {};
      for (const resp of responsesData ?? []) {
        const appId = resp.application_id;
        if (!grouped[appId]) {
          const app = resp.applications as unknown as {
            applicant_id: string;
            profiles: { display_name: string | null; email: string };
          };
          grouped[appId] = {
            application_id: appId,
            applicant_name: app?.profiles?.display_name ?? app?.profiles?.email ?? "-",
            answers: {},
            created_at: resp.created_at,
          };
        }
        grouped[appId].answers[resp.field_id] = resp.value;
      }
      setResponses(Object.values(grouped));

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        フォームが見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader title={form.title} description={form.description ?? undefined} />

      <PageContent>
        <Tabs defaultValue="fields">
          <TabsList>
            <TabsTrigger value="fields">フィールド ({fields.length})</TabsTrigger>
            <TabsTrigger value="responses">回答 ({responses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="mt-4">
            <div className="space-y-3">
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="flex items-start gap-4 pt-4">
                    <span className="text-sm font-bold text-muted-foreground w-6 pt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{field.label}</p>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            必須
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {fieldTypeLabels[field.type] ?? field.type}
                      </p>
                      {field.description && (
                        <p className="text-sm text-muted-foreground">{field.description}</p>
                      )}
                      {field.options && field.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {field.options.map((opt, i) => (
                            <Badge key={i} variant="outline">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="responses" className="mt-4">
            {responses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  まだ回答がありません
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto bg-white rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">応募者</TableHead>
                      {fields.map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                      <TableHead>回答日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((row) => (
                      <TableRow key={row.application_id}>
                        <TableCell className="font-medium sticky left-0 bg-background">
                          {row.applicant_name}
                        </TableCell>
                        {fields.map((field) => (
                          <TableCell key={field.id} className="max-w-xs truncate">
                            {row.answers[field.id] ?? "-"}
                          </TableCell>
                        ))}
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(row.created_at), "yyyy/MM/dd")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}
