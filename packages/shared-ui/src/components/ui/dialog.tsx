"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "../../lib/utils";

/**
 * DialogPanel のサイズプリセット。
 * モバイルでは `w-[calc(100%-2rem)]` で常に上下左右 1rem の余白を確保し、
 * `sm:` ブレークポイント以降で下記の max-width を適用する。
 */
const DIALOG_PANEL_SIZE_CLASSES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  "2xl": "sm:max-w-4xl",
} as const;

export type DialogPanelSize = keyof typeof DIALOG_PANEL_SIZE_CLASSES;

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl sm:rounded-[2rem] bg-background pt-6 px-4 pb-4 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-2xl sm:rounded-b-[2rem] border-t bg-muted/50 px-4 py-3 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/**
 * ヘッダー/ボディ/フッターで構成されるモーダルダイアログの共通シェル。
 *
 * すべてのダイアログに共通する以下の要素を集約:
 * - Root + Portal + Backdrop のセットアップ
 * - 画面中央配置とモバイルの上下左右 1rem 余白
 * - リング/シャドウ/角丸/アニメーション
 * - ヘッダー（border-b + タイトル）/ ボディ（スクロール）/ フッター（border-t）のレイアウト
 *
 * 個別画面はタイトル・本文・フッターボタンを slot として渡すだけでよい。
 *
 * @example
 * <DialogPanel
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="フォームタイトル"
 *   size="xl"
 *   footer={<>
 *     <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
 *     <Button onClick={handleSave}>保存</Button>
 *   </>}
 * >
 *   <input ... />
 * </DialogPanel>
 */
interface DialogPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** タイトル下に表示する補足テキスト */
  description?: ReactNode;
  /** ダイアログ幅のプリセット（デフォルト: "md"） */
  size?: DialogPanelSize;
  /** フッター領域に表示する要素（ボタン等） */
  footer?: ReactNode;
  /** フッター内要素の配置方向（デフォルト: flex row, justify-end） */
  footerClassName?: string;
  /** ボディ（children を囲むスクロール領域）の class を上書きする */
  bodyClassName?: string;
  /** Popup 要素自体の class を上書き（高さ固定等） */
  className?: string;
  /** スクリーンリーダー用ラベル。省略時は title の文字列を利用する想定 */
  ariaLabel?: string;
  children: ReactNode;
}

export function DialogPanel({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  footerClassName,
  bodyClassName,
  className,
  ariaLabel,
  children,
}: DialogPanelProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] rounded-2xl sm:rounded-[2rem] bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100",
            DIALOG_PANEL_SIZE_CLASSES[size],
            className
          )}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>

          {/* Body */}
          <div className={cn("flex-1 min-h-0 overflow-y-auto p-6", bodyClassName)}>{children}</div>

          {/* Footer */}
          {footer && (
            <div
              className={cn(
                "px-6 py-3 border-t shrink-0 flex items-center justify-end gap-2",
                footerClassName
              )}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
