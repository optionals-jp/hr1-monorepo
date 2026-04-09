"use client";

import { useState, useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useEmployees } from "@/lib/hooks/use-employees";
import { Search, Users, Mail } from "lucide-react";

export default function EmployeesPage() {
  const { data: employees = [], isLoading, error, mutate } = useEmployees();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        (e.display_name?.toLowerCase() ?? "").includes(q) ||
        (e.email?.toLowerCase() ?? "").includes(q) ||
        (e.position?.toLowerCase() ?? "").includes(q)
    );
  }, [employees, search]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="社員名簿"
        description={`${employees.length}名`}
        sticky={false}
        border={false}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center rounded-full bg-gray-100 px-4 py-2.5 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              placeholder="名前・メール・役職で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-2"
            />
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Users className="h-10 w-10 opacity-40" />
              <p className="text-sm">{search ? "該当する社員がいません" : "社員がいません"}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((emp) => {
                const name = emp.display_name ?? emp.email;
                const initial = (name ?? "?")[0]?.toUpperCase();
                return (
                  <Card key={emp.id} className="transition-colors hover:bg-accent/30">
                    <CardContent className="pt-4">
                      <div className="flex flex-col items-center text-center gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-medium">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 w-full">
                          <p className="text-sm font-semibold truncate">{name}</p>
                          {emp.position && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {emp.position}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center justify-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
