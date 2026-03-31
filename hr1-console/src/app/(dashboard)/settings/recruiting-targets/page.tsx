"use client";

import { useState, useEffect } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useDashboard } from "@/lib/hooks/use-dashboard";

const HIRING_TYPES = [
  { key: "new_grad", label: "新卒" },
  { key: "mid_career", label: "中途" },
] as const;

const TARGET_TYPES = [
  { key: "applications", label: "応募数目標" },
  { key: "offers", label: "内定数目標" },
] as const;

export default function RecruitingTargetsPage() {
  const { showToast } = useToast();
  const { targets, fiscalYear, saveTarget } = useDashboard();

  const [values, setValues] = useState<Record<string, Record<string, string>>>({
    new_grad: { applications: "", offers: "" },
    mid_career: { applications: "", offers: "" },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!targets) return;
    setValues({
      new_grad: {
        applications:
          targets.newGrad.applicationTarget > 0 ? String(targets.newGrad.applicationTarget) : "",
        offers: targets.newGrad.offerTarget > 0 ? String(targets.newGrad.offerTarget) : "",
      },
      mid_career: {
        applications:
          targets.midCareer.applicationTarget > 0
            ? String(targets.midCareer.applicationTarget)
            : "",
        offers: targets.midCareer.offerTarget > 0 ? String(targets.midCareer.offerTarget) : "",
      },
    });
  }, [targets]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const ht of HIRING_TYPES) {
        for (const tt of TARGET_TYPES) {
          const v = parseInt(values[ht.key][tt.key] || "0", 10);
          await saveTarget(ht.key, tt.key, isNaN(v) ? 0 : v);
        }
      }
      showToast("採用目標を保存しました");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="採用目標"
        description={`${fiscalYear}年度の採用目標を設定`}
        action={
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        }
      />
      <PageContent>
        <div className="max-w-xl space-y-8">
          {HIRING_TYPES.map((ht) => (
            <div key={ht.key} className="space-y-4">
              <h2 className="text-[15px] font-semibold">{ht.label}</h2>
              <div className="grid grid-cols-2 gap-4">
                {TARGET_TYPES.map((tt) => (
                  <div key={tt.key} className="space-y-2">
                    <Label>{tt.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={values[ht.key][tt.key]}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [ht.key]: { ...prev[ht.key], [tt.key]: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageContent>
    </>
  );
}
