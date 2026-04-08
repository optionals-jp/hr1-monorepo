"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { AlertCircle, Lock } from "lucide-react";

const SERVER_ERRORS: Record<string, string> = {
  unauthorized: "このアカウントには管理サイトへのアクセス権限がありません。",
};

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 認証済みならトップへリダイレクト
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  // サーバーサイド（middleware）からのエラーパラメータを表示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serverError = params.get("error");
    if (serverError && SERVER_ERRORS[serverError]) {
      setError(SERVER_ERRORS[serverError]);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 via-white to-blue-50/30 px-4">
      {/* 装飾 */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl" />

      <div className="relative w-full max-w-sm py-8">
        {/* ロゴ・タイトル */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <span className="text-base font-bold text-white">H</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            HR1 Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            HR1管理者アカウントでログイン
          </p>
        </div>

        {/* ログインカード */}
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hr1.jp"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  "ログイン中..."
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    ログイン
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* フッター */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; 2026 HR1 Studio. All rights reserved.
        </p>
      </div>
    </div>
  );
}
