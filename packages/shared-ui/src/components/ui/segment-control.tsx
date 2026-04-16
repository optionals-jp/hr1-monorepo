import { cn } from "../../lib/utils";

interface SegmentControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function SegmentControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentControlProps<T>) {
  return (
    <div className={cn("flex gap-2 rounded-2xl sm:rounded-3xl bg-muted p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "flex-1 rounded-xl sm:rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
