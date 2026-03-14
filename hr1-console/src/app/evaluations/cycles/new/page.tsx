"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useSWRConfig } from "swr";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { EvaluationTemplate } from "@/types/database";

export default function NewEvaluationCyclePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { mutate } = useSWRConfig();
  const { organization } = useOrg();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  // 多面評価シートのみ取得
  const { data: templates } = useQuery<EvaluationTemplate[]>(
    organization ? `eval-templates-multi-${organization.id}` : null,
    async () => {
      if (!organization) return [];
      const { data } = await getSupabase()
        .from("evaluation_templates")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("evaluation_type", "multi_rater")
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  );

  const handleSubmit = async () => {
    if (!organization || !user || !title || !templateId || !startDate || !endDate) return;
    setSaving(true);

    try {
      const cycleId = `cycle-${Date.now()}`;

      const { error } = await getSupabase()
        .from("evaluation_cycles")
        .insert({
          id: cycleId,
          organization_id: organization.id,
          title,
          description: description || null,
          template_id: templateId,
          start_date: startDate,
          end_date: endDate,
          created_by: user.id,
        });
      if (error) throw error;

      await mutate(`eval-cycles-${organization.id}`);
      showToast("評価サイクルを作成しました");
      router.push(`/evaluations/cycles/${cycleId}`);
    } catch {
      showToast("サイクルの作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="評価サイクルを作成"
        breadcrumb={[
          { label: "評価管理", href: "/evaluations" },
          { label: "評価サイクル", href: "/evaluations?tab=cycles" },
        ]}
      />

      <PageContent>
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>サイクル名 *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2026年度 上期評価"
                />
              </div>
              <div className="space-y-2">
                <Label>評価シート *</Label>
                {templates && templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    多面評価シートがありません。先に評価シートを作成してください。
                  </p>
                ) : (
                  <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="評価シートを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {(templates ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>開始日 *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日 *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="サイクルの説明"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/evaluations/cycles")}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title || !templateId || !startDate || !endDate || saving}
            >
              {saving ? "作成中..." : "サイクルを作成"}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
