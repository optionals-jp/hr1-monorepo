"use client";

import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useEmployee } from "@/lib/hooks/use-employees";
import { Mail, Phone, Building2, Briefcase, Calendar } from "lucide-react";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading, error, mutate } = useEmployee(id);

  const name = employee?.display_name ?? employee?.email ?? "";
  const initial = (name ?? "?")[0]?.toUpperCase();

  return (
    <div className="flex flex-col">
      <PageHeader
        title={isLoading ? "読み込み中..." : name}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "社員名簿", href: "/employees" }]}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
      ) : (
        employee && (
          <PageContent>
            <div className="max-w-2xl space-y-6">
              {/* プロフィールヘッダー */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-5">
                    <Avatar className="h-20 w-20">
                      {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={name} />}
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-medium">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold">{name}</h2>
                      {employee.name_kana && (
                        <p className="text-sm text-muted-foreground">{employee.name_kana}</p>
                      )}
                      {employee.position && (
                        <Badge variant="outline" className="mt-1.5">
                          {employee.position}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 基本情報 */}
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow icon={Mail} label="メール" value={employee.email} />
                  {employee.phone && <InfoRow icon={Phone} label="電話" value={employee.phone} />}
                  {employee.department && (
                    <InfoRow icon={Building2} label="部署" value={employee.department} />
                  )}
                  {employee.position && (
                    <InfoRow icon={Briefcase} label="役職" value={employee.position} />
                  )}
                  {employee.hire_date && (
                    <InfoRow
                      icon={Calendar}
                      label="入社日"
                      value={new Date(employee.hire_date).toLocaleDateString("ja-JP")}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </PageContent>
        )
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
