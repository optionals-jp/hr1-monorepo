"use client";

import React, { useState } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useOrg } from "@/lib/org-context";
import {
  useUnthreadedApplicants,
  useUnthreadedEmployees,
  createThread,
} from "@/lib/hooks/use-messages-page";
import type { Profile } from "@/types/database";
import { Search, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@hr1/shared-ui/components/ui/tabs";

export function NewThreadPanel({
  onCreated,
  onClose,
}: {
  onCreated: (threadId: string) => void;
  onClose: () => void;
}) {
  const { organization } = useOrg();
  const [tab, setTab] = useState<"applicant" | "employee">("applicant");
  const [appSearch, setAppSearch] = useState("");
  const [creating, setCreating] = useState(false);

  type ApplicantWithJobs = Profile & { job_titles: string };
  const { data: applicants = [], isLoading: appsLoading } = useUnthreadedApplicants() as {
    data: ApplicantWithJobs[] | undefined;
    isLoading: boolean;
  };

  // スレッドが未作成の社員一覧を取得
  const { data: employees = [], isLoading: empsLoading } = useUnthreadedEmployees();

  const filteredApplicants = applicants.filter((a) => {
    if (!appSearch) return true;
    const s = appSearch.toLowerCase();
    const name = a.display_name?.toLowerCase() ?? "";
    const email = a.email?.toLowerCase() ?? "";
    const jobs = a.job_titles?.toLowerCase() ?? "";
    return name.includes(s) || email.includes(s) || jobs.includes(s);
  });

  const filteredEmps = employees.filter((emp) => {
    if (!appSearch) return true;
    const s = appSearch.toLowerCase();
    const name = emp.display_name?.toLowerCase() ?? "";
    const email = emp.email?.toLowerCase() ?? "";
    const dept = emp.department?.toLowerCase() ?? "";
    return name.includes(s) || email.includes(s) || dept.includes(s);
  });

  const handleCreateApplicant = async (applicantId: string) => {
    if (!organization || creating) return;
    setCreating(true);

    const { data: newThread } = await createThread({
      organization_id: organization.id,
      participant_id: applicantId,
      participant_type: "applicant",
    });

    setCreating(false);
    if (newThread) onCreated(newThread.id);
  };

  const handleCreateEmployee = async (employeeId: string) => {
    if (!organization || creating) return;
    setCreating(true);

    const { data: newThread } = await createThread({
      organization_id: organization.id,
      participant_id: employeeId,
      participant_type: "employee",
    });

    setCreating(false);
    if (newThread) onCreated(newThread.id);
  };

  const isLoading = tab === "applicant" ? appsLoading : empsLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">新規メッセージ — 送信先を選択</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 pt-2">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as "applicant" | "employee");
              setAppSearch("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="applicant" className="flex-1">
                候補者
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex-1">
                社員
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center h-11 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder={tab === "applicant" ? "候補者名・求人名で検索" : "社員名・部署で検索"}
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-11"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : tab === "applicant" ? (
            filteredApplicants.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {applicants.length === 0
                  ? "スレッド未作成の候補者がいません"
                  : "一致する候補者がいません"}
              </div>
            ) : (
              filteredApplicants.map((applicant) => {
                const name = applicant.display_name ?? applicant.email ?? "不明";

                return (
                  <button
                    key={applicant.id}
                    type="button"
                    onClick={() => handleCreateApplicant(applicant.id)}
                    disabled={creating}
                    className="w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                          {name[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {applicant.job_titles}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )
          ) : filteredEmps.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {employees.length === 0 ? "スレッド未作成の社員がいません" : "一致する社員がいません"}
            </div>
          ) : (
            filteredEmps.map((emp) => {
              const name = emp.display_name ?? emp.email ?? "不明";

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleCreateEmployee(emp.id)}
                  disabled={creating}
                  className="w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                        {name[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[emp.department, emp.position].filter(Boolean).join(" / ") || "社員"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
