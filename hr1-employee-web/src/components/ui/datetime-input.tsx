"use client";

import { cn } from "@hr1/shared-ui/lib/utils";

interface DatetimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  minDateTime?: string;
}

/** datetime-local ベースの簡易日時入力 */
export function DatetimeInput({
  value,
  onChange,
  disabled,
  className,
  minDateTime,
}: DatetimeInputProps) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={minDateTime}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm",
        className
      )}
    />
  );
}
