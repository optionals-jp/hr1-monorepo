"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Panel, PanelHeader, PanelBody } from "./panel";
import { cn } from "@/lib/utils";
import type { HiringTypeApplicationStats, RecruitingTargets } from "@/types/dashboard";

interface TargetProgressPanelProps {
  stats: HiringTypeApplicationStats | undefined;
  targets: RecruitingTargets | undefined;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  if (target <= 0) {
    return <span className="text-[11px] text-muted-foreground/50">目標未設定</span>;
  }
  const pct = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-bold tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

function Row({
  label,
  applications,
  applicationTarget,
  offered,
  offerTarget,
}: {
  label: string;
  applications: number;
  applicationTarget: number;
  offered: number;
  offerTarget: number;
}) {
  return (
    <div className="space-y-2 py-3 border-b border-border/40 last:border-0">
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-muted-foreground">応募数</span>
            <span className="text-[13px] font-bold tabular-nums">
              {applications}
              {applicationTarget > 0 && (
                <span className="text-muted-foreground font-normal"> / {applicationTarget}</span>
              )}
            </span>
          </div>
          <ProgressBar current={applications} target={applicationTarget} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-muted-foreground">内定数</span>
            <span className="text-[13px] font-bold tabular-nums">
              {offered}
              {offerTarget > 0 && (
                <span className="text-muted-foreground font-normal"> / {offerTarget}</span>
              )}
            </span>
          </div>
          <ProgressBar current={offered} target={offerTarget} />
        </div>
      </div>
    </div>
  );
}

export function TargetProgressPanel({ stats, targets }: TargetProgressPanelProps) {
  const s = stats ?? {
    newGrad: { applications: 0, offered: 0 },
    midCareer: { applications: 0, offered: 0 },
  };
  const t = targets ?? {
    newGrad: { applicationTarget: 0, offerTarget: 0 },
    midCareer: { applicationTarget: 0, offerTarget: 0 },
    all: { applicationTarget: 0, offerTarget: 0 },
  };

  return (
    <Panel>
      <PanelHeader
        title="採用目標進捗"
        action={
          <Link
            href="/settings/recruiting-targets"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            <Settings2 className="h-3.5 w-3.5" />
            目標設定
          </Link>
        }
      />
      <PanelBody className="pt-0">
        <Row
          label="新卒"
          applications={s.newGrad.applications}
          applicationTarget={t.newGrad.applicationTarget}
          offered={s.newGrad.offered}
          offerTarget={t.newGrad.offerTarget}
        />
        <Row
          label="中途"
          applications={s.midCareer.applications}
          applicationTarget={t.midCareer.applicationTarget}
          offered={s.midCareer.offered}
          offerTarget={t.midCareer.offerTarget}
        />
      </PanelBody>
    </Panel>
  );
}
