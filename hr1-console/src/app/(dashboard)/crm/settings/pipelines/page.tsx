"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { usePipelines } from "@/lib/hooks/use-pipelines";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as pipelineRepo from "@/lib/repositories/pipeline-repository";
import { EditPanel } from "@/components/ui/edit-panel";
import { Plus, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PipelineSettingsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: pipelines, mutate } = usePipelines();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreatePipeline = async () => {
    if (!organization || !newPipelineName.trim()) {
      showToast("パイプライン名を入力してください", "error");
      return;
    }
    try {
      await pipelineRepo.createPipeline(getSupabase(), {
        organization_id: organization.id,
        name: newPipelineName.trim(),
        is_default: !pipelines?.some((p) => p.is_default),
        sort_order: pipelines?.length ?? 0,
      });
      setNewPipelineName("");
      setEditOpen(false);
      mutate();
      showToast("パイプラインを作成しました");
    } catch {
      showToast("パイプラインの作成に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="パイプライン設定"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
        action={
          <Button onClick={() => setEditOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            パイプライン追加
          </Button>
        }
      />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-2 pr-0" />
              <TableHead>パイプライン名</TableHead>
              <TableHead>ステージ数</TableHead>
              <TableHead>ステージ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={!pipelines}
              isEmpty={pipelines?.length === 0}
              emptyMessage="パイプラインがありません"
            >
              {(pipelines ?? []).map((pipeline) => {
                const stageCount = pipeline.crm_pipeline_stages?.length ?? 0;
                const isExpanded = expandedIds.has(pipeline.id);
                return (
                  <Fragment key={pipeline.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => router.push(`/crm/settings/pipelines/${pipeline.id}`)}
                    >
                      <TableCell className="w-8 pl-2 pr-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(pipeline.id);
                          }}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pipeline.name}</span>
                          {pipeline.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              デフォルト
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{stageCount}ステージ</TableCell>
                      <TableCell>
                        {stageCount > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pipeline.crm_pipeline_stages?.map((s, i) => (
                              <span key={s.id} className="flex items-center gap-1.5 text-sm">
                                {i > 0 && <span className="text-muted-foreground">→</span>}
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && stageCount > 0 && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <div className="bg-muted/30 px-6 py-3 border-b">
                            <div className="flex items-center gap-2">
                              {pipeline.crm_pipeline_stages?.map((stage, i) => (
                                <Fragment key={stage.id}>
                                  {i > 0 && (
                                    <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                                  )}
                                  <div
                                    className={cn(
                                      "flex items-center gap-2 rounded-lg border bg-background px-3 py-2",
                                      "text-sm"
                                    )}
                                  >
                                    <span
                                      className="w-3 h-3 rounded-full shrink-0"
                                      style={{ backgroundColor: stage.color }}
                                    />
                                    <span className="font-medium">{stage.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {stage.probability_default}%
                                    </span>
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="パイプライン追加"
        onSave={handleCreatePipeline}
        saveLabel="作成"
      >
        <div className="space-y-4">
          <div>
            <Label>パイプライン名 *</Label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="例: エンタープライズ営業"
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
