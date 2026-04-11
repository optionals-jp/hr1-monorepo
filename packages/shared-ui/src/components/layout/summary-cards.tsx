"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { cn } from "../../lib/utils";

/**
 * SummaryCards の 1 カード分の設定。
 *
 * - `key`: `values` から数値を引くためのキー（呼び出し側の集計型のキーと一致）
 * - `label`: カード上部に表示するラベル
 * - `icon`: lucide-react のアイコン
 * - `iconClassName`: アイコンに付ける色クラスなど（例: `text-blue-600`）
 */
export interface SummaryCardConfig<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
}

export interface SummaryCardsProps<K extends string> {
  /** カードの定義配列。配列の順で左から表示される。 */
  cards: readonly SummaryCardConfig<K>[];
  /** key → 数値のマップ。`cards` のすべての key を含む必要がある。 */
  values: Record<K, number>;
  /** 外側ラッパーに追加で適用するクラス */
  className?: string;
}

/**
 * ページヘッダ直下に並べる KPI サマリカード。
 *
 * - モバイル (< md) では 3 列 + 高さ・フォントを圧縮
 * - md 以上では 5 列 + Card のデフォルトサイズ
 * - Card / CardHeader / CardContent の責務分割で、カード上部の詰まりを回避する
 *
 * 呼び出し側でラップする `<div>` のパディング（`px-4 sm:px-6 md:px-8` 等）は
 * ページ固有の PageHeader 系レイアウトに合わせるため、このコンポーネントは
 * 内側の grid のみを描画する。外側は呼び出し側で用意する。
 */
export function SummaryCards<K extends string>({
  cards,
  values,
  className,
}: SummaryCardsProps<K>) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-5",
        // md 未満で 3 列に入らない（カード数 > 3）ときは 2 段目以降に折り返す。
        // 逆に 5 枚未満の場合でも `md:grid-cols-5` だと伸びすぎるので
        // 呼び出し側で `className` を渡して上書きできる。
        className
      )}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const value = values[card.key];
        return (
          // モバイルでは max-md: でデフォルトの padding/gap/font-size を縮めて
          // 1 枚あたりの高さを抑える。md+ では Card のデフォルトに戻す。
          <Card key={card.key} className="max-md:py-2 max-md:gap-0.5">
            <CardHeader className="max-md:px-3">
              <div className="flex items-center gap-2 max-md:gap-1.5">
                <Icon className={cn("size-4 max-md:size-3", card.iconClassName)} />
                <p className="text-xs text-muted-foreground max-md:text-[10px]">{card.label}</p>
              </div>
            </CardHeader>
            <CardContent className="max-md:px-3">
              <p className="text-2xl font-bold tabular-nums max-md:text-base">{value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
