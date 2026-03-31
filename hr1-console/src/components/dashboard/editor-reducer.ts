import { widgetsToRows, rowsToWidgets, applyTemplate, applyDrop } from "@/lib/dashboard/row-utils";
import type { DashboardRow } from "@/lib/dashboard/row-utils";
import type { DashboardWidgetConfigV2 } from "@/types/dashboard";

export interface EditorState {
  widgetMap: Map<string, DashboardWidgetConfigV2>;
  rows: DashboardRow[];
}

export type EditorAction =
  | { type: "INIT"; config: DashboardWidgetConfigV2[] }
  | { type: "UPDATE_WIDGET"; id: string; updates: Partial<DashboardWidgetConfigV2> }
  | { type: "DELETE_WIDGET"; id: string }
  | { type: "ADD_WIDGET"; widget: DashboardWidgetConfigV2 }
  | { type: "APPLY_DROP"; widgetId: string; dropTarget: Parameters<typeof applyDrop>[2] }
  | { type: "APPLY_TEMPLATE"; template: "single" | "double" };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "INIT": {
      return {
        widgetMap: new Map(action.config.map((w) => [w.id, w])),
        rows: widgetsToRows(action.config),
      };
    }
    case "UPDATE_WIDGET": {
      const next = new Map(state.widgetMap);
      const existing = next.get(action.id);
      if (existing) next.set(action.id, { ...existing, ...action.updates });
      return { ...state, widgetMap: next };
    }
    case "DELETE_WIDGET": {
      const next = new Map(state.widgetMap);
      next.delete(action.id);
      const rows = state.rows
        .map((row) => ({
          ...row,
          widgetIds: row.widgetIds.filter((wid) => wid !== action.id),
        }))
        .filter((row) => row.widgetIds.length > 0);
      return { widgetMap: next, rows };
    }
    case "ADD_WIDGET": {
      const next = new Map(state.widgetMap);
      next.set(action.widget.id, action.widget);
      const rows = [...state.rows, { id: crypto.randomUUID(), widgetIds: [action.widget.id] }];
      return { widgetMap: next, rows };
    }
    case "APPLY_DROP": {
      return {
        ...state,
        rows: applyDrop(state.rows, action.widgetId, action.dropTarget),
      };
    }
    case "APPLY_TEMPLATE": {
      return {
        ...state,
        rows: applyTemplate(state.rows, action.template),
      };
    }
  }
}

export const INITIAL_EDITOR_STATE: EditorState = {
  widgetMap: new Map(),
  rows: [],
};

export { rowsToWidgets };
