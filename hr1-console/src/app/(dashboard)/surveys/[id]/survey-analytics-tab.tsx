"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, csvFilenameWithDate } from "@/lib/export-csv";
import { surveyQuestionTypeLabels } from "@/lib/constants";
import type { PulseSurveyQuestion, PulseSurveyResponse } from "@/types/database";

interface SurveyAnalyticsTabProps {
  questions: PulseSurveyQuestion[];
  responses: PulseSurveyResponse[];
  totalTargetUsers: number;
  surveyTitle: string;
}

const BAR_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e"];

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}時間${remainingMinutes}分`;
}

export function SurveyAnalyticsTab({
  questions,
  responses,
  totalTargetUsers,
  surveyTitle,
}: SurveyAnalyticsTabProps) {
  const completedResponses = useMemo(() => responses.filter((r) => r.completed_at), [responses]);

  const completedCount = completedResponses.length;
  const unansweredCount = Math.max(0, totalTargetUsers - completedCount);
  const responseRate =
    totalTargetUsers > 0 ? Math.round((completedCount / totalTargetUsers) * 100) : 0;

  const avgResponseTime = useMemo(() => {
    const durations = completedResponses
      .map((r) => {
        if (!r.completed_at || !r.created_at) return null;
        return new Date(r.completed_at).getTime() - new Date(r.created_at).getTime();
      })
      .filter((d): d is number => d !== null && d > 0);
    if (durations.length === 0) return null;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }, [completedResponses]);

  function handleExportCSV() {
    const rows = completedResponses.map((r) => {
      const row: Record<string, unknown> = {
        respondent: r.user_id,
        completed_at: r.completed_at ? format(new Date(r.completed_at), "yyyy/MM/dd HH:mm") : "",
      };
      questions.forEach((q, i) => {
        const answer = r.pulse_survey_answers?.find((a) => a.question_id === q.id);
        row[`q${i}`] = answer?.value ?? "";
      });
      return row;
    });

    const columns = [
      { key: "respondent" as const, label: "回答者" },
      { key: "completed_at" as const, label: "回答日時" },
      ...questions.map((q, i) => ({
        key: `q${i}` as keyof (typeof rows)[0],
        label: q.label,
      })),
    ];

    exportToCSV(rows, columns, csvFilenameWithDate(`サーベイ_${surveyTitle}`));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">分析結果</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={completedCount === 0}
        >
          <Download className="h-4 w-4 mr-1" />
          CSVエクスポート
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="回答率" value={`${responseRate}%`} />
        <KpiCard label="回答数" value={`${completedCount}件`} />
        <KpiCard label="未回答数" value={`${unansweredCount}件`} />
        <KpiCard
          label="平均回答時間"
          value={avgResponseTime ? formatDuration(avgResponseTime) : "---"}
        />
      </div>

      {questions.map((q, i) => (
        <QuestionAnalysis key={q.id} question={q} index={i} responses={completedResponses} />
      ))}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="pt-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function QuestionAnalysis({
  question,
  index,
  responses,
}: {
  question: PulseSurveyQuestion;
  index: number;
  responses: PulseSurveyResponse[];
}) {
  const answers = useMemo(() => {
    return responses
      .map((r) => r.pulse_survey_answers?.find((a) => a.question_id === question.id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined && a.value !== null);
  }, [responses, question.id]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Q{index + 1}</span>
          <CardTitle className="text-sm font-medium">{question.label}</CardTitle>
          <Badge variant="outline">
            {surveyQuestionTypeLabels[question.type] ?? question.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {answers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">回答データがありません</p>
        ) : question.type === "rating" ? (
          <RatingChart answers={answers} />
        ) : question.type === "single_choice" || question.type === "multiple_choice" ? (
          <ChoiceChart answers={answers} />
        ) : (
          <TextResponses answers={answers} />
        )}
      </CardContent>
    </Card>
  );
}

function RatingChart({ answers }: { answers: { value: string | null }[] }) {
  const { distribution, avg } = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let count = 0;
    answers.forEach((a) => {
      const val = parseInt(a.value ?? "");
      if (val >= 1 && val <= 5) {
        dist[val] = (dist[val] || 0) + 1;
        sum += val;
        count++;
      }
    });
    return {
      distribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating: `${rating}`,
        count: dist[rating],
      })),
      avg: count > 0 ? (sum / count).toFixed(1) : "---",
    };
  }, [answers]);

  return (
    <div className="flex items-start gap-8">
      <div className="flex flex-col items-center justify-center py-4 min-w-[80px]">
        <span className="text-3xl font-bold">{avg}</span>
        <span className="text-xs text-muted-foreground mt-1">平均スコア</span>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={distribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="rating"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip formatter={(value) => [`${value}件`, "回答数"]} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {distribution.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChoiceChart({ answers }: { answers: { value: string | null }[] }) {
  const data = useMemo(() => {
    const freq: Record<string, number> = {};
    answers.forEach((a) => {
      const val = a.value ?? "";
      if (val) {
        freq[val] = (freq[val] || 0) + 1;
      }
    });
    const total = Object.values(freq).reduce((s, v) => s + v, 0);
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([option, count]) => ({
        option,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [answers]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">回答データがありません</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 40 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="option"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip
          formatter={(value, _name, props) => {
            const pct = (props as { payload: { percentage: number } }).payload.percentage;
            return [`${value}件 (${pct}%)`, "回答数"];
          }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TextResponses({ answers }: { answers: { value: string | null }[] }) {
  const [expanded, setExpanded] = useState(false);
  const textValues = answers.map((a) => a.value ?? "").filter(Boolean);
  const displayCount = expanded ? textValues.length : 5;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{textValues.length}件の回答</p>
      <div className="space-y-2">
        {textValues.slice(0, displayCount).map((text, i) => (
          <div key={i} className="rounded-md border px-3 py-2 text-sm">
            {text}
          </div>
        ))}
      </div>
      {textValues.length > 5 && !expanded && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
          もっと見る ({textValues.length - 5}件)
        </Button>
      )}
    </div>
  );
}
