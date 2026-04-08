import React from "react";

export function DashboardLayout({
  header,
  sidebar,
  mobileNav,
  children,
}: {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  mobileNav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {header}
      <div className="flex min-h-0">
        {sidebar}
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
      {mobileNav}
    </>
  );
}
