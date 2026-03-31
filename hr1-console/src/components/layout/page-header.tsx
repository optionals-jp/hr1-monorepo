import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  tabs?: ReactNode;
  sticky?: boolean;
  border?: boolean;
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({
  title,
  description,
  action,
  tabs,
  sticky = true,
  border = true,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-white/80 backdrop-blur-xl px-4 sm:px-6 md:px-8",
        sticky ? "pt-4 md:pt-6" : "pt-2 md:pt-3",
        sticky && "sticky top-14 z-10",
        sticky && border && "border-b"
      )}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          {breadcrumb.map((item, i) => (
            <span key={item.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            </span>
          ))}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{title}</span>
        </div>
      )}
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          tabs ? "pb-3" : sticky ? "pb-4 sm:pb-5" : "pb-2"
        )}
      >
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {tabs && <div>{tabs}</div>}
    </div>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">{children}</div>;
}
