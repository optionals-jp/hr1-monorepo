"use client";

import { format } from "date-fns";
import type { Profile } from "@/types/database";

const GENDER_LABELS: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

export function ProfileInfoList({ profile }: { profile: Profile }) {
  const currentAddress = [
    profile.current_prefecture,
    profile.current_city,
    profile.current_street_address,
    profile.current_building,
  ]
    .filter(Boolean)
    .join(" ");

  const sections: { title: string; items: { label: string; value: string | null }[] }[] = [
    {
      title: "基本情報",
      items: [
        { label: "ふりがな", value: profile.name_kana },
        {
          label: "採用区分",
          value: profile.hiring_type
            ? profile.hiring_type === "new_grad"
              ? `新卒${profile.graduation_year ? `（${profile.graduation_year}年卒）` : ""}`
              : "中途採用"
            : null,
        },
        { label: "生年月日", value: profile.birth_date },
        {
          label: "性別",
          value: profile.gender ? (GENDER_LABELS[profile.gender] ?? profile.gender) : null,
        },
        { label: "電話番号", value: profile.phone },
        { label: "居住地", value: currentAddress || null },
        { label: "登録日", value: format(new Date(profile.created_at), "yyyy/MM/dd") },
      ],
    },
    {
      title: "学歴",
      items: [
        { label: "学校名", value: profile.school_name },
        { label: "学部・学科", value: profile.school_faculty },
      ],
    },
    {
      title: "職歴・スキル",
      items: [
        { label: "職歴", value: profile.work_history },
        { label: "スキル", value: profile.skills },
      ],
    },
    {
      title: "自己紹介",
      items: [{ label: "自己紹介", value: profile.self_introduction }],
    },
  ];

  return (
    <div className="space-y-6 text-sm">
      {sections.map((section, i) => (
        <div key={section.title} className={i > 0 ? "border-t pt-6" : ""}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {section.title}
          </h3>
          <div className="space-y-4">
            {section.items.map((item) => (
              <div key={item.label} className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">{item.label}</span>
                <span className="whitespace-pre-wrap">{item.value || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
