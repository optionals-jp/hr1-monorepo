import type { DashboardWidgetConfigV2 } from "@/types/dashboard";

/**
 * 編集時の行データ構造。
 * 1行に1〜2個のウィジェットを配置する。
 */
export interface DashboardRow {
  id: string;
  widgetIds: string[];
}

/**
 * フラットなウィジェット配列 → 行構造に変換。
 * layout: "full" → 単独行、"left"+"right" → 2列行。
 */
export function widgetsToRows(widgets: DashboardWidgetConfigV2[]): DashboardRow[] {
  const rows: DashboardRow[] = [];
  let i = 0;

  while (i < widgets.length) {
    const w = widgets[i];
    if (w.layout === "left" && i + 1 < widgets.length && widgets[i + 1].layout === "right") {
      rows.push({ id: crypto.randomUUID(), widgetIds: [w.id, widgets[i + 1].id] });
      i += 2;
    } else {
      rows.push({ id: crypto.randomUUID(), widgetIds: [w.id] });
      i += 1;
    }
  }

  return rows;
}

/**
 * 行構造 → フラットなウィジェット配列に変換。
 * layout を行内の位置から再計算する。
 */
export function rowsToWidgets(
  rows: DashboardRow[],
  widgetMap: Map<string, DashboardWidgetConfigV2>
): DashboardWidgetConfigV2[] {
  const result: DashboardWidgetConfigV2[] = [];

  for (const row of rows) {
    if (row.widgetIds.length === 1) {
      const w = widgetMap.get(row.widgetIds[0]);
      if (w) result.push({ ...w, layout: "full" });
    } else if (row.widgetIds.length === 2) {
      const left = widgetMap.get(row.widgetIds[0]);
      const right = widgetMap.get(row.widgetIds[1]);
      if (left) result.push({ ...left, layout: "left" });
      if (right) result.push({ ...right, layout: "right" });
    }
  }

  return result;
}

/**
 * レイアウトテンプレートを適用。
 * ウィジェットの順序は保持し、行構造のみ変更。
 */
export function applyTemplate(rows: DashboardRow[], template: "single" | "double"): DashboardRow[] {
  const allIds = rows.flatMap((r) => r.widgetIds);

  if (template === "single") {
    return allIds.map((id) => ({ id: crypto.randomUUID(), widgetIds: [id] }));
  }

  // double: 2個ずつペアにする
  const result: DashboardRow[] = [];
  for (let i = 0; i < allIds.length; i += 2) {
    if (i + 1 < allIds.length) {
      result.push({ id: crypto.randomUUID(), widgetIds: [allIds[i], allIds[i + 1]] });
    } else {
      result.push({ id: crypto.randomUUID(), widgetIds: [allIds[i]] });
    }
  }
  return result;
}

/**
 * ドラッグ結果から行構造を更新。
 *
 * dropType:
 *   - "between": 行の間にドロップ → 新しい単独行を挿入
 *   - "side": 既存の単独行の横にドロップ → 2列行に変換
 */
export function applyDrop(
  rows: DashboardRow[],
  draggedWidgetId: string,
  dropTarget:
    | {
        type: "between";
        rowIndex: number;
      }
    | {
        type: "side";
        rowIndex: number;
        position: "left" | "right";
      }
): DashboardRow[] {
  // ドロップ先の行ID を事前に記録（side ドロップ用）
  const targetRowId =
    dropTarget.type === "side" && dropTarget.rowIndex < rows.length
      ? rows[dropTarget.rowIndex].id
      : null;

  // ドロップ先の前にある行をカウント（between ドロップのインデックス補正用）
  const betweenInsertAfterRowId =
    dropTarget.type === "between" && dropTarget.rowIndex > 0 && dropTarget.rowIndex <= rows.length
      ? rows[dropTarget.rowIndex - 1].id
      : null;

  // 1. ドラッグ元の行からウィジェットを削除
  let newRows = rows.map((r) => ({
    ...r,
    widgetIds: r.widgetIds.filter((id) => id !== draggedWidgetId),
  }));
  // 空行を削除
  newRows = newRows.filter((r) => r.widgetIds.length > 0);

  // 2. ドロップ先に配置（IDベースで行を検索）
  if (dropTarget.type === "between") {
    const newRow: DashboardRow = {
      id: crypto.randomUUID(),
      widgetIds: [draggedWidgetId],
    };
    if (betweenInsertAfterRowId) {
      const idx = newRows.findIndex((r) => r.id === betweenInsertAfterRowId);
      newRows.splice(idx + 1, 0, newRow);
    } else {
      // rowIndex === 0 の場合は先頭に挿入
      newRows.splice(0, 0, newRow);
    }
  } else if (dropTarget.type === "side") {
    const targetRow = targetRowId ? newRows.find((r) => r.id === targetRowId) : undefined;
    if (targetRow && targetRow.widgetIds.length < 2) {
      if (dropTarget.position === "left") {
        targetRow.widgetIds.unshift(draggedWidgetId);
      } else {
        targetRow.widgetIds.push(draggedWidgetId);
      }
    } else {
      // フォールバック: 新しい行として末尾に挿入
      newRows.push({
        id: crypto.randomUUID(),
        widgetIds: [draggedWidgetId],
      });
    }
  }

  return newRows;
}
