"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Briefcase } from "lucide-react";
import type { OpenJobStat } from "@/types/dashboard";

export type { OpenJobStat };

interface OpenJobsChartProps {
  data: OpenJobStat[];
}

export function OpenJobsChart({ data }: OpenJobsChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base font-semibold">公開中の求人</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">求人別の応募・内定状況</p>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Briefcase className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">公開中の求人がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.department ?? "部署未設定"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{job.applicantCount}</p>
                    <p className="text-[10px] text-muted-foreground">応募</p>
                  </div>
                  {job.offeredCount > 0 && (
                    <Badge variant="secondary" className="tabular-nums">
                      内定 {job.offeredCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
