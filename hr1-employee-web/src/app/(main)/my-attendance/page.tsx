"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";

export default function MyAttendancePage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="勤怠" description="出退勤の記録と勤務履歴" sticky={false} border={false} />
      <PageContent>
        <div className="max-w-md space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">現在の勤務状況</p>
              <div className="flex gap-3">
                <Button>
                  <LogIn className="h-4 w-4 mr-1.5" />
                  出勤
                </Button>
                <Button variant="outline">
                  <LogOut className="h-4 w-4 mr-1.5" />
                  退勤
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">勤務履歴</h2>
              <p className="text-sm text-muted-foreground text-center py-6">勤務履歴は準備中です</p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
