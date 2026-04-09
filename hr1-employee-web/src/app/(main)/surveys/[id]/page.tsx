"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import {
  useSurveyQuestions,
  useMySurveyResponse,
  useSubmitSurvey,
} from "@/lib/hooks/use-survey-detail";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { CheckCircle2, Star } from "lucide-react";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: surveyId } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const {
    data: questions = [],
    isLoading: questionsLoading,
    error: questionsError,
    mutate,
  } = useSurveyQuestions(surveyId);
  const { data: existingResponse } = useMySurveyResponse(surveyId);
  const { submit } = useSubmitSurvey();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasResponded = !!existingResponse;

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = async () => {
    const requiredMissing = questions
      .filter((q) => q.is_required)
      .some((q) => !answers[q.id]?.trim());

    if (requiredMissing) {
      showToast("必須の質問に回答してください", "error");
      return;
    }

    setSubmitting(true);
    try {
      await submit(
        surveyId,
        Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([question_id, value]) => ({ question_id, value }))
      );
      showToast("回答を送信しました");
      router.push("/surveys");
    } catch {
      showToast("送信に失敗しました", "error");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="サーベイ回答"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "サーベイ", href: "/surveys" }]}
      />
      {questionsError && <QueryErrorBanner error={questionsError} onRetry={() => mutate()} />}

      <PageContent>
        <div className="max-w-2xl space-y-6">
          {hasResponded ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="text-sm font-medium">このサーベイは回答済みです</p>
                <Link href="/surveys" className="text-sm text-primary hover:underline">
                  サーベイ一覧に戻る
                </Link>
              </CardContent>
            </Card>
          ) : questionsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">質問がありません</div>
          ) : (
            <>
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground shrink-0">
                        Q{idx + 1}.
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {q.label}
                          {q.is_required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        {q.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{q.description}</p>
                        )}
                      </div>
                    </div>

                    {q.type === "rating" && (
                      <div className="flex gap-1 pl-7">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setAnswer(q.id, String(n))}
                            className="p-1 transition-colors"
                          >
                            <Star
                              className={cn(
                                "h-6 w-6",
                                Number(answers[q.id]) >= n
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === "text" && (
                      <div className="pl-7">
                        <textarea
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          placeholder="回答を入力..."
                          rows={3}
                          className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    )}

                    {q.type === "single_choice" && q.options && (
                      <div className="pl-7 space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                              answers[q.id] === opt
                                ? "border-primary bg-primary/5"
                                : "hover:bg-accent/50"
                            )}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => setAnswer(q.id, opt)}
                              className="accent-primary"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "multiple_choice" && q.options && (
                      <div className="pl-7 space-y-2">
                        {q.options.map((opt) => {
                          const selected: string[] = (() => {
                            try {
                              return JSON.parse(answers[q.id] ?? "[]");
                            } catch {
                              return [];
                            }
                          })();
                          const isChecked = selected.includes(opt);
                          return (
                            <label
                              key={opt}
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                                isChecked ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const next = isChecked
                                    ? selected.filter((s) => s !== opt)
                                    : [...selected, opt];
                                  setAnswer(q.id, JSON.stringify(next));
                                }}
                                className="accent-primary"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/surveys">
                  <Button variant="ghost">キャンセル</Button>
                </Link>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "送信中..." : "回答を送信"}
                </Button>
              </div>
            </>
          )}
        </div>
      </PageContent>
    </div>
  );
}
