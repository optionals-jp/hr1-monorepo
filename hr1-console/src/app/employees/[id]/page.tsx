"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { format } from "date-fns";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        社員が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={profile.display_name ?? profile.email}
        description="社員詳細"
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">名前</span>
              <span>{profile.display_name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">メール</span>
              <span>{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">部署</span>
              <span>{profile.department ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">役職</span>
              <span>{profile.position ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ロール</span>
              <Badge variant="secondary">社員</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">登録日</span>
              <span>{format(new Date(profile.created_at), "yyyy/MM/dd")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
