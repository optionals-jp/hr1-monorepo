"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2 } from "lucide-react";

export interface EditableItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export function emptyItem(): EditableItem {
  return { description: "", quantity: 1, unit: "式", unit_price: 0, amount: 0 };
}

interface QuoteItemsEditorProps {
  items: EditableItem[];
  updateItem: (index: number, field: keyof EditableItem, value: unknown) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export function QuoteItemsEditor({
  items,
  updateItem,
  addItem,
  removeItem,
  subtotal,
  taxRate,
  taxAmount,
  total,
}: QuoteItemsEditorProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="size-4" />
          明細
        </h2>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="size-4 mr-1" />
          行を追加
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-2 py-2 font-medium w-8">#</th>
              <th className="text-left px-2 py-2 font-medium">品目・説明</th>
              <th className="text-right px-2 py-2 font-medium w-20">数量</th>
              <th className="text-left px-2 py-2 font-medium w-16">単位</th>
              <th className="text-right px-2 py-2 font-medium w-28">単価</th>
              <th className="text-right px-2 py-2 font-medium w-28">金額</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                <td className="px-2 py-1">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder="品目名"
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                    className="h-8 text-right"
                    min={0}
                    step={0.01}
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    value={item.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                    className="h-8 text-right"
                    min={0}
                  />
                </td>
                <td className="px-2 py-1 text-right tabular-nums font-medium">
                  ¥{item.amount.toLocaleString()}
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">小計</span>
            <span className="tabular-nums">¥{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">消費税（{taxRate}%）</span>
            <span className="tabular-nums">¥{taxAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-1">
            <span>合計</span>
            <span className="tabular-nums">¥{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
