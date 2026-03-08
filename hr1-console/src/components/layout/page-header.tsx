import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  tabs?: ReactNode;
  sticky?: boolean;
}

export function PageHeader({ title, description, action, tabs, sticky = true }: PageHeaderProps) {
  return (
    <div className={`bg-white px-4 pt-4 sm:px-6 md:px-8 md:pt-6${sticky ? " border-b sticky top-0 z-10" : ""}`}>
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${tabs ? "pb-3" : sticky ? "pb-4 sm:pb-5" : "pb-2"}`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {tabs && <div>{tabs}</div>}
    </div>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {children}
    </div>
  );
}
