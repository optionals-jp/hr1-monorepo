"use client";

import { useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyServiceRequests } from "@/lib/hooks/use-service-requests";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Headset, Plus } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  open: "受付中",
  in_progress: "対応中",
  closed: "完了",
};

export default function ServiceRequestsPage() {
  const { showToast } = useToast();
  const { data: requests = [], isLoading, error, mutate, createRequest } = useMyServiceRequests();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("一般");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await createRequest(category, title.trim(), description.trim());
      setShowForm(false);
      setTitle("");
      setDescription("");
      showToast("リクエストを送信しました");
    } catch {
      showToast("送信に失敗しました", "error");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="サービスリクエスト"
        description="人事部門へのリクエスト"
        sticky={false}
        border={false}
        action={
          !showForm ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新規リクエスト
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="space-y-4 max-w-2xl">
          {showForm && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>カテゴリ</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="例: 証明書発行、住所変更"
                  />
                </div>
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="リクエストの概要"
                  />
                </div>
                <div className="space-y-2">
                  <Label>詳細</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="詳細を入力してください"
                    rows={4}
                    className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!title.trim() || !description.trim() || submitting}
                  >
                    送信
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : requests.length === 0 && !showForm ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Headset className="h-10 w-10 opacity-40" />
              <p className="text-sm">リクエストはありません</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {requests.map((req) => (
                <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{req.title}</p>
                      <Badge
                        variant={
                          req.status === "closed"
                            ? "default"
                            : req.status === "in_progress"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {statusLabels[req.status] ?? req.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.category}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{req.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {format(new Date(req.created_at), "yyyy/MM/dd HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
