"use client";

import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { MetaChip, MetaChipGroup } from "@hr1/shared-ui/components/ui/meta-chip";
import {
  Award,
  Activity,
  Check,
  Circle,
  ClipboardList,
  FileSearch,
  FileText,
  SkipForward,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@hr1/shared-ui/lib/utils";
import { stepTypeLabels, StepType, StepStatus } from "@/lib/constants";
import type { ReactNode } from "react";

/**
 * 選考ステップ表示の共通プリミティブ。
 *
 * - `/selection-steps/[id]` (テンプレ・マスタ)
 * - `/applications/[id]` (個別応募の進行状況)
 * の両方で同じビジュアル言語（rounded-2xl / bg-muted/40 / ring-1 / タイムライン左カラム）
 * を共有するための汎用コンポーネント群。
 *
 * 構成:
 *   <div className="flex gap-3 sm:gap-4">
 *     <StepTimelineColumn />
 *     <StepCardShell> ... </StepCardShell>
 *   </div>
 */

export const stepTypeIcons: Record<string, LucideIcon> = {
  [StepType.Screening]: FileSearch,
  [StepType.Form]: ClipboardList,
  [StepType.Interview]: Users,
  [StepType.ExternalTest]: Activity,
  [StepType.Offer]: Award,
};

export function StepTypeIcon({ stepType, className }: { stepType: string; className?: string }) {
  const Icon = stepTypeIcons[stepType] ?? FileText;
  return <Icon className={className} />;
}

export function StepTypeBadge({ stepType }: { stepType: string }) {
  return (
    <Badge
      variant="outline"
      className="h-7 shrink-0 gap-1.5 px-3 text-sm font-medium [&>svg]:size-3.5!"
    >
      <StepTypeIcon stepType={stepType} className="text-muted-foreground" />
      {stepTypeLabels[stepType] ?? stepType}
    </Badge>
  );
}

export type StepMetaItem = { icon: LucideIcon; label: string };

export function StepMetaChips({ items }: { items: StepMetaItem[] }) {
  if (items.length === 0) return null;
  return (
    <MetaChipGroup className="mt-2.5">
      {items.map(({ icon, label }, i) => (
        <MetaChip key={i} icon={icon}>
          {label}
        </MetaChip>
      ))}
    </MetaChipGroup>
  );
}

/**
 * タイムライン左カラム。
 * status に応じて番号バブルか状態アイコン（Check/Circle/Skip）を表示する。
 */
export function StepTimelineColumn({
  index,
  isLast,
  status,
  alignTop = true,
}: {
  index: number;
  isLast: boolean;
  status?: string | null;
  alignTop?: boolean;
}) {
  const bubble = renderTimelineBubble(index, status);
  const isCompleted = status === StepStatus.Completed;
  return (
    <div className="flex flex-col items-center shrink-0 self-stretch">
      <div className={alignTop ? "mt-3" : undefined}>{bubble}</div>
      {!isLast && (
        <div className={cn("w-px flex-1 mt-1.5", isCompleted ? "bg-green-400" : "bg-border")} />
      )}
    </div>
  );
}

function renderTimelineBubble(index: number, status?: string | null) {
  const baseRing = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full";

  if (status === StepStatus.Completed) {
    return (
      <div className={cn(baseRing, "bg-green-100 text-green-600")}>
        <Check className="h-4 w-4" />
      </div>
    );
  }
  if (status === StepStatus.InProgress) {
    return (
      <div className={cn(baseRing, "bg-primary/10 text-primary ring-2 ring-primary/20")}>
        <Circle className="h-3.5 w-3.5 fill-current" />
      </div>
    );
  }
  if (status === StepStatus.Skipped) {
    return (
      <div className={cn(baseRing, "bg-orange-100 text-orange-500")}>
        <SkipForward className="h-4 w-4" />
      </div>
    );
  }
  // pending or undefined: 番号バブル
  return (
    <div
      className={cn(
        baseRing,
        "border bg-background text-xs font-semibold tabular-nums text-foreground"
      )}
    >
      {index + 1}
    </div>
  );
}

/**
 * 選考ステップの本体カード。共通の rounded-2xl/bg-muted/40/ring-1 ビジュアルを担う。
 * `actions` には右側に並べる操作（編集/削除/開始/完了 等）を渡せる。
 */
export function StepCardShell({
  children,
  className,
  highlight = false,
  dimmed = false,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-3xl bg-muted/40 p-4 sm:p-5 ring-1 ring-foreground/5",
        highlight && "bg-primary/5 ring-primary/30",
        dimmed && "opacity-60",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 「タイムライン + カード」の典型レイアウト。多くの呼び出し側はこれだけで足りる。
 */
export function StepRow({
  index,
  isLast,
  status,
  children,
}: {
  index: number;
  isLast: boolean;
  status?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <StepTimelineColumn index={index} isLast={isLast} status={status} />
      <div className={cn("flex-1 min-w-0", isLast ? "" : "pb-5")}>{children}</div>
    </div>
  );
}
