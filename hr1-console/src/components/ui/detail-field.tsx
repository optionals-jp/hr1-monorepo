import type { ReactNode } from "react";

export function DetailField({
  label,
  children,
  labelWidth = "w-24",
}: {
  label: string;
  children: ReactNode;
  labelWidth?: string;
}) {
  return (
    <div className="flex gap-8 text-sm">
      <span className={`text-muted-foreground ${labelWidth} shrink-0`}>{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
