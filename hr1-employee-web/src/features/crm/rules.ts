import type { BcDeal, BcActivity, CrmDealStageHistory } from "@/types/database";

// --- Forecast ---

export type ForecastCategory = "pipeline" | "bestCase" | "commit" | "closed";

export function categorizeDeal(deal: BcDeal): ForecastCategory {
  if (deal.status === "won") return "closed";
  const prob = deal.probability ?? 0;
  if (prob >= 75) return "commit";
  if (prob >= 50) return "bestCase";
  return "pipeline";
}

export function getWeightedAmount(deal: BcDeal): number {
  if (deal.status === "won") return deal.amount ?? 0;
  return ((deal.amount ?? 0) * (deal.probability ?? 0)) / 100;
}

export function getMonthKey(dateStr: string | null): string {
  if (!dateStr) return "未定";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getQuarterKey(dateStr: string | null): string {
  if (!dateStr) return "未定";
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()} Q${q}`;
}

export interface ForecastCategorySummary {
  count: number;
  amount: number;
  weighted: number;
}

export function computeCategorySummary(
  deals: BcDeal[]
): Record<ForecastCategory, ForecastCategorySummary> {
  const summary: Record<ForecastCategory, ForecastCategorySummary> = {
    pipeline: { count: 0, amount: 0, weighted: 0 },
    bestCase: { count: 0, amount: 0, weighted: 0 },
    commit: { count: 0, amount: 0, weighted: 0 },
    closed: { count: 0, amount: 0, weighted: 0 },
  };
  for (const deal of deals) {
    const cat = categorizeDeal(deal);
    summary[cat].count++;
    summary[cat].amount += deal.amount ?? 0;
    summary[cat].weighted += getWeightedAmount(deal);
  }
  return summary;
}

export interface MonthlyForecast {
  month: string;
  pipeline: number;
  bestCase: number;
  commit: number;
  closed: number;
  total: number;
}

export function computeChartData(
  deals: BcDeal[],
  periodMode: "monthly" | "quarterly"
): MonthlyForecast[] {
  const getKey = periodMode === "monthly" ? getMonthKey : getQuarterKey;
  const map = new Map<string, MonthlyForecast>();

  for (const deal of deals) {
    const key = getKey(deal.expected_close_date);
    if (!map.has(key)) {
      map.set(key, { month: key, pipeline: 0, bestCase: 0, commit: 0, closed: 0, total: 0 });
    }
    const entry = map.get(key)!;
    const cat = categorizeDeal(deal);
    const weighted = getWeightedAmount(deal);
    entry[cat] += weighted;
    entry.total += weighted;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.month === "未定") return 1;
    if (b.month === "未定") return -1;
    return a.month.localeCompare(b.month);
  });
}

export interface RepForecast {
  name: string;
  pipeline: number;
  bestCase: number;
  commit: number;
  closed: number;
  total: number;
}

export function computeRepForecast(deals: BcDeal[]): RepForecast[] {
  const map = new Map<string, RepForecast>();
  for (const deal of deals) {
    const name = deal.profiles?.display_name ?? "未割当";
    if (!map.has(name)) {
      map.set(name, { name, pipeline: 0, bestCase: 0, commit: 0, closed: 0, total: 0 });
    }
    const entry = map.get(name)!;
    const cat = categorizeDeal(deal);
    const weighted = getWeightedAmount(deal);
    entry[cat] += weighted;
    entry.total += weighted;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// --- Dashboard KPI ---

export interface CrmKpi {
  openDeals: BcDeal[];
  wonDeals: BcDeal[];
  lostDeals: BcDeal[];
  winRate: number;
  pipelineAmount: number;
  wonAmount: number;
  weightedAmount: number;
}

export function computeCrmKpi(deals: BcDeal[]): CrmKpi {
  const openDeals = deals.filter((d) => d.status === "open");
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const closedCount = wonDeals.length + lostDeals.length;
  const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;
  const pipelineAmount = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const wonAmount = wonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const weightedAmount = openDeals.reduce(
    (sum, d) => sum + (d.amount ?? 0) * ((d.probability ?? 0) / 100),
    0
  );
  return { openDeals, wonDeals, lostDeals, winRate, pipelineAmount, wonAmount, weightedAmount };
}

export interface StageData {
  id: string;
  name: string;
  color: string;
  count: number;
  amount: number;
}

export function computeStageFunnel(
  stages: { id: string; name: string; color: string }[],
  openDeals: BcDeal[]
): StageData[] {
  return stages.map((stage) => {
    const stageDeals = openDeals.filter(
      (d) => d.stage_id === stage.id || (!d.stage_id && d.stage === stage.name)
    );
    return {
      ...stage,
      count: stageDeals.length,
      amount: stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    };
  });
}

export interface AssigneeSummary {
  name: string;
  count: number;
  amount: number;
}

export function computeAssigneeSummary(openDeals: BcDeal[]): AssigneeSummary[] {
  return Object.values(
    openDeals.reduce(
      (acc, d) => {
        const name = d.profiles?.display_name ?? "未割当";
        if (!acc[name]) acc[name] = { name, count: 0, amount: 0 };
        acc[name].count++;
        acc[name].amount += d.amount ?? 0;
        return acc;
      },
      {} as Record<string, AssigneeSummary>
    )
  ).sort((a, b) => b.amount - a.amount);
}

export function formatJpy(amount: number): string {
  if (amount >= 100_000_000) return `¥${(amount / 100_000_000).toFixed(1)}億`;
  if (amount >= 10_000) return `¥${(amount / 10_000).toFixed(0)}万`;
  if (amount > 0) return `¥${amount.toLocaleString()}`;
  return "¥0";
}

// --- Pipeline Analysis ---

export interface StageMetric {
  stage: { id: string; name: string; color: string };
  count: number;
  amount: number;
  weighted: number;
  avgDays: number;
}

export function computeStageMetrics(
  stages: { id: string; name: string; color: string }[],
  openDeals: BcDeal[],
  stageHistory: CrmDealStageHistory[]
): StageMetric[] {
  return stages.map((stage) => {
    const stageDeals = openDeals.filter(
      (d) => d.stage_id === stage.id || (!d.stage_id && d.stage === stage.name)
    );
    const amount = stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
    const weighted = stageDeals.reduce(
      (sum, d) => sum + (d.amount ?? 0) * ((d.probability ?? 0) / 100),
      0
    );

    const transitions = stageHistory.filter((h) => h.to_stage_id === stage.id);
    let avgDays = 0;
    if (transitions.length > 0) {
      const durations = transitions
        .map((t) => {
          const exit = stageHistory.find(
            (h) =>
              h.deal_id === t.deal_id && h.from_stage_id === stage.id && h.changed_at > t.changed_at
          );
          if (!exit) return null;
          return (
            (new Date(exit.changed_at).getTime() - new Date(t.changed_at).getTime()) /
            (1000 * 60 * 60 * 24)
          );
        })
        .filter((d): d is number => d !== null);
      avgDays = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    }

    return {
      stage,
      count: stageDeals.length,
      amount,
      weighted,
      avgDays: Math.round(avgDays * 10) / 10,
    };
  });
}

export interface ConversionRate {
  from: string;
  to: string;
  rate: number;
  fromColor: string;
  toColor: string;
}

export function computeConversionRates(
  stages: { name: string; color: string }[],
  stageMetrics: StageMetric[]
): ConversionRate[] {
  if (stages.length < 2) return [];
  return stages.slice(0, -1).map((stage, i) => {
    const nextStage = stages[i + 1];
    const currentCount = stageMetrics[i]?.count ?? 0;
    const nextCount = stageMetrics[i + 1]?.count ?? 0;
    const rate = currentCount > 0 ? Math.round((nextCount / currentCount) * 100) : 0;
    return {
      from: stage.name,
      to: nextStage.name,
      rate,
      fromColor: stage.color,
      toColor: nextStage.color,
    };
  });
}

export interface PipelineVelocity {
  dealCount: number;
  avgAmount: number;
  winRate: number;
  avgDays: number;
  velocity: number;
}

export function computePipelineVelocity(
  deals: BcDeal[],
  openDeals: BcDeal[],
  wonDeals: BcDeal[],
  stageMetrics: StageMetric[]
): PipelineVelocity {
  const closedDeals = deals.filter((d) => d.status === "won" || d.status === "lost");
  const winRate = closedDeals.length > 0 ? wonDeals.length / closedDeals.length : 0;
  const avgAmount =
    openDeals.length > 0
      ? openDeals.reduce((s, d) => s + (d.amount ?? 0), 0) / openDeals.length
      : 0;
  const totalAvgDays = stageMetrics.reduce((s, m) => s + m.avgDays, 0) || 1;

  return {
    dealCount: openDeals.length,
    avgAmount,
    winRate: Math.round(winRate * 100),
    avgDays: Math.round(totalAvgDays),
    velocity: Math.round((openDeals.length * avgAmount * winRate) / totalAvgDays),
  };
}

// --- Win/Loss Analysis ---

export interface WinLossSummary {
  wonDeals: BcDeal[];
  lostDeals: BcDeal[];
  closedCount: number;
  winRate: number;
  wonAmount: number;
  lostAmount: number;
  avgWonAmount: number;
  avgLostAmount: number;
}

export function computeWinLossSummary(deals: BcDeal[]): WinLossSummary {
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const closedCount = wonDeals.length + lostDeals.length;
  const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;
  const wonAmount = wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const lostAmount = lostDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const avgWonAmount = wonDeals.length > 0 ? Math.round(wonAmount / wonDeals.length) : 0;
  const avgLostAmount = lostDeals.length > 0 ? Math.round(lostAmount / lostDeals.length) : 0;
  return {
    wonDeals,
    lostDeals,
    closedCount,
    winRate,
    wonAmount,
    lostAmount,
    avgWonAmount,
    avgLostAmount,
  };
}

export interface MonthlyWinLoss {
  month: string;
  won: number;
  lost: number;
}

export function computeMonthlyTrend(wonDeals: BcDeal[], lostDeals: BcDeal[]): MonthlyWinLoss[] {
  const map = new Map<string, MonthlyWinLoss>();
  for (const d of [...wonDeals, ...lostDeals]) {
    const date = new Date(d.updated_at);
    const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { month: key, won: 0, lost: 0 });
    const entry = map.get(key)!;
    if (d.status === "won") entry.won++;
    else entry.lost++;
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export interface AmountBracketResult {
  label: string;
  won: number;
  lost: number;
  total: number;
  rate: number;
}

export function computeAmountBrackets(
  wonDeals: BcDeal[],
  lostDeals: BcDeal[]
): AmountBracketResult[] {
  const brackets = [
    { label: "〜50万", min: 0, max: 500_000 },
    { label: "50万〜100万", min: 500_000, max: 1_000_000 },
    { label: "100万〜500万", min: 1_000_000, max: 5_000_000 },
    { label: "500万〜", min: 5_000_000, max: Infinity },
  ];
  return brackets.map((b) => {
    const bracketWon = wonDeals.filter((d) => (d.amount ?? 0) >= b.min && (d.amount ?? 0) < b.max);
    const bracketLost = lostDeals.filter(
      (d) => (d.amount ?? 0) >= b.min && (d.amount ?? 0) < b.max
    );
    const total = bracketWon.length + bracketLost.length;
    return {
      label: b.label,
      won: bracketWon.length,
      lost: bracketLost.length,
      total,
      rate: total > 0 ? Math.round((bracketWon.length / total) * 100) : 0,
    };
  });
}

export interface RepWinRate {
  name: string;
  won: number;
  lost: number;
  total: number;
  rate: number;
}

export function computeRepWinRates(wonDeals: BcDeal[], lostDeals: BcDeal[]): RepWinRate[] {
  const map = new Map<string, { name: string; won: number; lost: number }>();
  for (const d of [...wonDeals, ...lostDeals]) {
    const name = d.profiles?.display_name ?? "未割当";
    if (!map.has(name)) map.set(name, { name, won: 0, lost: 0 });
    const entry = map.get(name)!;
    if (d.status === "won") entry.won++;
    else entry.lost++;
  }
  return Array.from(map.values())
    .map((r) => ({
      ...r,
      total: r.won + r.lost,
      rate: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
}

// --- Performance ---

export interface RepPerformance {
  name: string;
  deals: number;
  won: number;
  lost: number;
  wonAmount: number;
  totalAmount: number;
  activities: number;
  winRate: number;
}

export function computeRepPerformance(deals: BcDeal[], activities: BcActivity[]): RepPerformance[] {
  const map = new Map<
    string,
    {
      name: string;
      deals: number;
      won: number;
      lost: number;
      wonAmount: number;
      totalAmount: number;
      activities: number;
    }
  >();

  for (const d of deals) {
    const name = d.profiles?.display_name ?? "未割当";
    if (!map.has(name)) {
      map.set(name, {
        name,
        deals: 0,
        won: 0,
        lost: 0,
        wonAmount: 0,
        totalAmount: 0,
        activities: 0,
      });
    }
    const entry = map.get(name)!;
    entry.deals++;
    entry.totalAmount += d.amount ?? 0;
    if (d.status === "won") {
      entry.won++;
      entry.wonAmount += d.amount ?? 0;
    } else if (d.status === "lost") {
      entry.lost++;
    }
  }

  for (const a of activities) {
    const name = a.profiles?.display_name ?? a.profiles?.email ?? "不明";
    if (!map.has(name)) {
      map.set(name, {
        name,
        deals: 0,
        won: 0,
        lost: 0,
        wonAmount: 0,
        totalAmount: 0,
        activities: 0,
      });
    }
    map.get(name)!.activities++;
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      winRate: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0,
    }))
    .sort((a, b) => b.wonAmount - a.wonAmount);
}

// --- Period Filter ---

export function getDateFilter(period: string): Date | null {
  if (period === "all") return null;
  const d = new Date();
  const match = period.match(/^(\d+)(d|m)$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (match[2] === "m") d.setMonth(d.getMonth() - value);
  else d.setDate(d.getDate() - value);
  return d;
}
