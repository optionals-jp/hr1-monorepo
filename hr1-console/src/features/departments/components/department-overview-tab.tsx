"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { DetailField } from "@/components/ui/detail-field";
import { cn } from "@/lib/utils";
import { genderLabels } from "@/lib/constants";
import { format, differenceInYears } from "date-fns";
import type { Department } from "@/types/database";
import type { DeptMember } from "@/lib/hooks/use-department-detail";

interface DepartmentOverviewTabProps {
  department: Department;
  members: DeptMember[];
  onEdit: () => void;
}

export function DepartmentOverviewTab({ department, members, onEdit }: DepartmentOverviewTabProps) {
  const demographics = useMemo(() => {
    const now = new Date();
    const ages = members
      .filter((m) => m.birth_date)
      .map((m) => differenceInYears(now, new Date(m.birth_date!)));
    const avgAge =
      ages.length > 0
        ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10
        : null;

    const genderCounts: Record<string, number> = {};
    let genderTotal = 0;
    for (const m of members) {
      if (m.gender) {
        genderCounts[m.gender] = (genderCounts[m.gender] ?? 0) + 1;
        genderTotal++;
      }
    }

    const tenures = members
      .filter((m) => m.hire_date)
      .map((m) => differenceInYears(now, new Date(m.hire_date!)));
    const avgTenure =
      tenures.length > 0
        ? Math.round((tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10) / 10
        : null;

    return { avgAge, genderCounts, genderTotal, avgTenure };
  }, [members]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">部署情報</h2>
          <Button variant="outline" size="xs" onClick={onEdit}>
            編集
          </Button>
        </div>
        <div className="space-y-4">
          <DetailField label="部署名">{department.name}</DetailField>
          <DetailField label="社員数">{members.length} 名</DetailField>
          <DetailField label="作成日">
            {format(new Date(department.created_at), "yyyy/MM/dd")}
          </DetailField>
        </div>
      </SectionCard>

      {members.length > 0 && (
        <div className="lg:col-span-2">
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3">メンバー統計</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">平均年齢</p>
                <p className="text-2xl font-bold">
                  {demographics.avgAge !== null ? `${demographics.avgAge}` : "-"}
                </p>
                {demographics.avgAge !== null && (
                  <p className="text-xs text-muted-foreground">歳</p>
                )}
              </div>
              <div className="rounded-xl bg-white border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">平均勤続年数</p>
                <p className="text-2xl font-bold">
                  {demographics.avgTenure !== null ? `${demographics.avgTenure}` : "-"}
                </p>
                {demographics.avgTenure !== null && (
                  <p className="text-xs text-muted-foreground">年</p>
                )}
              </div>
              <div className="rounded-xl bg-white border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">男女比</p>
                {demographics.genderTotal > 0 ? (
                  <div className="space-y-1.5 mt-1">
                    {Object.entries(demographics.genderCounts).map(([gender, count]) => {
                      const pct = Math.round((count / demographics.genderTotal) * 100);
                      return (
                        <div key={gender} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {genderLabels[gender] ?? gender}
                          </span>
                          <span className="font-medium">
                            {count}名 ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-2xl font-bold">-</p>
                )}
              </div>
            </div>

            {demographics.genderTotal > 0 && (
              <div className="mt-4">
                <div className="flex h-3 rounded-full overflow-hidden">
                  {Object.entries(demographics.genderCounts).map(([gender, count]) => {
                    const pct = (count / demographics.genderTotal) * 100;
                    const colors: Record<string, string> = {
                      male: "bg-blue-400",
                      female: "bg-pink-400",
                      other: "bg-gray-400",
                    };
                    return (
                      <div
                        key={gender}
                        className={cn("transition-all", colors[gender] ?? "bg-gray-300")}
                        style={{ width: `${pct}%` }}
                        title={`${genderLabels[gender] ?? gender}: ${count}名`}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-1.5">
                  {Object.entries(demographics.genderCounts).map(([gender]) => {
                    const colors: Record<string, string> = {
                      male: "bg-blue-400",
                      female: "bg-pink-400",
                      other: "bg-gray-400",
                    };
                    return (
                      <div
                        key={gender}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5 rounded-full",
                            colors[gender] ?? "bg-gray-300"
                          )}
                        />
                        {genderLabels[gender] ?? gender}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
