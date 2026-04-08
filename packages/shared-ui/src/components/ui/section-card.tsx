import { cn } from "../../lib/utils";

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <div className={cn("rounded-2xl sm:rounded-3xl bg-muted/40 p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}
