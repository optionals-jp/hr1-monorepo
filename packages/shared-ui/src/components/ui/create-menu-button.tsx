"use client";

import type { ComponentType } from "react";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { buttonVariants } from "./button";
import { cn } from "../../lib/utils";

export type CreateMenuItem = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
};

export type CreateMenuButtonProps = {
  label?: string;
  items: CreateMenuItem[];
  align?: "start" | "center" | "end";
  size?: "xs" | "sm" | "default" | "lg";
  variant?:
    | "default"
    | "primary"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link";
};

/**
 * Plusアイコン付きのドロップダウン型「新規作成」ボタン。
 * 複数の作成アクションをまとめるユースケース向け。
 */
export function CreateMenuButton({
  label = "新規作成",
  items,
  align = "end",
  size = "sm",
  variant = "primary",
}: CreateMenuButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant, size }), "cursor-pointer")}
      >
        <Plus className="h-4 w-4" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={idx} onClick={item.onClick}>
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
