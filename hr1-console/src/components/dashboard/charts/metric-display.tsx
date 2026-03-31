"use client";

export interface MetricDisplayProps {
  metrics: { value: number; label: string; suffix?: string }[];
}

export function MetricDisplay({ metrics }: MetricDisplayProps) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-5">
      {metrics.map((m) => (
        <div key={m.label} className="flex-1 min-w-25">
          <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">
            {m.value.toLocaleString()}
            {m.suffix && (
              <span className="text-sm font-medium text-muted-foreground">{m.suffix}</span>
            )}
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
