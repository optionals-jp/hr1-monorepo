"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-muted-foreground hover:bg-gray-200",
        destructive: "bg-gray-100 text-destructive hover:bg-destructive/10",
        ghost: "bg-transparent text-muted-foreground hover:bg-gray-100",
      },
      size: {
        sm: "h-7 w-7 [&_svg:not([class*='size-'])]:size-4",
        default: "h-8 w-8 [&_svg:not([class*='size-'])]:size-[1.125rem]",
        lg: "h-10 w-10 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
}

/**
 * 丸いチップ状のアイコン専用ボタン。
 * ヘッダーのヘルプ・通知アイコン、詳細カードの編集・削除ボタンなど、
 * コンテンツ面に浮かぶ補助アクションに使う。
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, variant, size, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

export { iconButtonVariants };
