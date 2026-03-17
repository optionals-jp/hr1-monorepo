"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { PulseSurvey } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { surveyStatusLabels, surveyStatusColors, surveyTargetLabels } from "@/lib/constants";
import { EditPanel } from "@/components/ui/edit-panel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { mutate } from "swr";
import { useToast } from "@/components/ui/toast";

export default function SurveysPage() {
  const { organization } = useOrg();
  const router = useRouter();
  const { showToast } = useToast();

  const cacheKey = organization ? `pulse-surveys-${organization.id}` : null;

  const { data: surveys = [], isLoading } = useQuery<PulseSurvey[]>(cacheKey, async () => {
    const { data } = await getSupabase()
      .from("pulse_surveys")
      .select("*, pulse_survey_questions(id)")
      .eq("organization_id", organization!.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

  // 作成パネル
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // フォーム
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<string>("employee");
  const [deadline, setDeadline] = useState("");

  function openCreate() {
    setTitle("");
    setDescription("");
    setTarget("employee");
    setDeadline("");
    setEditOpen(true);
  }

  async function handleSave() {
    if (!organization || !title.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await getSupabase()
        .from("pulse_surveys")
        .insert({
          organization_id: organization.id,
          title: title.trim(),
          description: description.trim() || null,
          target,
          deadline: deadline ? `${deadline}T23:59:59+09:00` : null,
        })
        .select()
        .single();
      if (error) {
        showToast("サーベイの作成に失敗しました", "error");
        return;
      }
      await mutate(cacheKey);
      setEditOpen(false);
      showToast("サーベイを作成しました");
      if (data) {
        router.push(`/surveys/${data.id}`);
      }
    } catch {
      showToast("サーベイの作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="パルスサーベイ"
        description="応募者・社員向けサーベイの作成・管理"
        sticky={false}
        action={<Button onClick={openCreate}>サーベイを作成</Button>}
      />

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>質問数</TableHead>
              <TableHead>締切</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={surveys.length === 0}
              emptyMessage="サーベイがありません"
            >
              {surveys.map((survey) => (
                <TableRow
                  key={survey.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/surveys/${survey.id}`)}
                >
                  <TableCell className="font-medium">{survey.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {surveyTargetLabels[survey.target] ?? survey.target}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={surveyStatusColors[survey.status] ?? "outline"}>
                      {surveyStatusLabels[survey.status] ?? survey.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{survey.pulse_survey_questions?.length ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {survey.deadline ? format(new Date(survey.deadline), "yyyy/MM/dd") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(survey.created_at), "yyyy/MM/dd")}
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
        title="サーベイを作成"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!title.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="サーベイのタイトル"
            />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="サーベイの説明（任意）"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>対象</Label>
              <Select value={target} onValueChange={(v) => v && setTarget(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(surveyTargetLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>締切日</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={todayStr}
              />
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
