import { cn } from "../../lib/utils";

type ActionBarVariant = "warning" | "info" | "error";

const variantStyles: Record<ActionBarVariant, { border: string; bg: string; icon: string; title: string; desc: string }> = {
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    icon: "text-amber-600",
    title: "text-amber-900",
    desc: "text-amber-700",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    icon: "text-blue-600",
    title: "text-blue-900",
    desc: "text-blue-700",
  },
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    icon: "text-red-600",
    title: "text-red-900",
    desc: "text-red-700",
  },
};

interface ActionBarProps {
  variant?: ActionBarVariant;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ActionBar({
  variant = "warning",
  icon,
  title,
  description,
  children,
  className,
}: ActionBarProps) {
  const styles = variantStyles[variant];
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-3xl border px-4 py-3 flex items-center gap-3",
        styles.border,
        styles.bg,
        className
      )}
    >
      {icon && <span className={cn("shrink-0", styles.icon)}>{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", styles.title)}>{title}</p>
        {description && (
          <p className={cn("text-xs mt-0.5", styles.desc)}>{description}</p>
        )}
      </div>
      {children && <div className="flex gap-2 shrink-0">{children}</div>}
    </div>
  );
}
