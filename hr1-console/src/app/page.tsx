"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { Users, UserPlus, Briefcase, ClipboardList } from "lucide-react";

interface Stats {
  applicants: number;
  employees: number;
  openJobs: number;
  activeApplications: number;
}

export default function DashboardPage() {
  const { organization } = useOrg();

  const { data: stats } = useQuery<Stats>(
    organization ? `dashboard-stats-${organization.id}` : null,
    async () => {
      const orgId = organization!.id;

      const [applicantsRes, employeesRes, jobsRes, appsRes] = await Promise.all([
        getSupabase()
          .from("user_organizations")
          .select("user_id, profiles!inner(role)", { count: "exact" })
          .eq("organization_id", orgId)
          .eq("profiles.role", "applicant"),
        getSupabase()
          .from("user_organizations")
          .select("user_id, profiles!inner(role)", { count: "exact" })
          .eq("organization_id", orgId)
          .eq("profiles.role", "employee"),
        getSupabase()
          .from("jobs")
          .select("id", { count: "exact" })
          .eq("organization_id", orgId)
          .eq("status", "open"),
        getSupabase()
          .from("applications")
          .select("id", { count: "exact" })
          .eq("organization_id", orgId)
          .eq("status", "active"),
      ]);

      return {
        applicants: applicantsRes.count ?? 0,
        employees: employeesRes.count ?? 0,
        openJobs: jobsRes.count ?? 0,
        activeApplications: appsRes.count ?? 0,
      };
    }
  );

  const displayStats = stats ?? {
    applicants: 0,
    employees: 0,
    openJobs: 0,
    activeApplications: 0,
  };

  const cards = [
    {
      title: "応募者",
      value: displayStats.applicants,
      icon: UserPlus,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "社員",
      value: displayStats.employees,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "公開中の求人",
      value: displayStats.openJobs,
      icon: Briefcase,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "選考中の応募",
      value: displayStats.activeApplications,
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <>
      <PageHeader title="ダッシュボード" description={organization?.name ?? ""} />
      <PageContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} className="border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContent>
    </>
  );
}
