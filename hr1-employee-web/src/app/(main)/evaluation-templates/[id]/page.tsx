"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { useOrg } from "@/lib/org-context";
import { loadApplicantTemplateDetail } from "@/lib/hooks/use-evaluations";
import { scoreTypeLabels } from "@/lib/constants";
import type { EvaluationTemplate, EvaluationCriterion, EvaluationAnchor } from "@/types/database";

export default function EvaluationTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [anchors, setAnchors] = useState<EvaluationAnchor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    let cancelled = false;
    loadApplicantTemplateDetail(organization.id, id).then((result) => {
      if (cancelled) return;
      setTemplate(result.template);
      setCriteria(result.criteria);
      setAnchors(result.anchors);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, organization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        評価テンプレートが見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={template.title}
        description={template.description ?? undefined}
        breadcrumb={[{ label: "評価テンプレート", href: "/evaluation-templates" }]}
        sticky={false}
      />

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <div className="max-w-3xl space-y-6">
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3">基本情報</h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground w-20 shrink-0">対象</span>
                <Badge variant="outline">候補者向け</Badge>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-20 shrink-0">作成日</span>
                <span>{format(new Date(template.created_at), "yyyy/MM/dd")}</span>
              </div>
            </div>
          </SectionCard>

          <div>
            <h2 className="text-sm font-semibold mb-3">
              評価項目
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {criteria.length}
              </span>
            </h2>
            {criteria.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">評価項目がありません</p>
            ) : (
              <SectionCard>
                {criteria.map((c, index) => {
                  const criterionAnchors = anchors
                    .filter((a) => a.criterion_id === c.id)
                    .sort((a, b) => a.score_value - b.score_value);
                  return (
                    <div key={c.id} className="flex items-start gap-4 px-5 py-4">
                      <span className="text-sm font-bold text-muted-foreground w-6 pt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{c.label}</p>
                          <Badge variant="outline" className="text-xs">
                            {scoreTypeLabels[c.score_type] ?? c.score_type}
                          </Badge>
                        </div>
                        {c.description && (
                          <p className="text-sm text-muted-foreground">{c.description}</p>
                        )}
                        {c.options && c.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.options.map((opt, i) => (
                              <Badge key={i} variant="secondary">
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {criterionAnchors.length > 0 && (
                          <div className="pt-2 space-y-1">
                            {criterionAnchors.map((a) => (
                              <div key={a.id} className="flex gap-3 text-xs">
                                <span className="text-muted-foreground w-8 shrink-0 tabular-nums">
                                  {a.score_value}
                                </span>
                                <span className="whitespace-pre-wrap">{a.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
