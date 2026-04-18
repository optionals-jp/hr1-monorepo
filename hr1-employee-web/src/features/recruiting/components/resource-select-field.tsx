"use client";

import type { JSX } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";

/**
 * id / title を持つリソース（フォーム・面接日程など）から1件を選択する Select。
 * ad-hoc-step-dialog / step-manage-dialog で重複していた
 * 「フォームを選択」「日程調整を選択」UI を共通化したもの。
 */
export function ResourceSelectField<T extends { id: string; title: string }>({
  id,
  value,
  onChange,
  items,
  placeholder,
}: {
  id?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  items: T[];
  placeholder: string;
}): JSX.Element {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder}>
          {(v: string) => items.find((it) => it.id === v)?.title ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => (
          <SelectItem key={it.id} value={it.id}>
            {it.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
