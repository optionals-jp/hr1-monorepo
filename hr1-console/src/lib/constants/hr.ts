export const genderLabels: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

export const hiringTypeLabels: Record<string, string> = {
  new_grad: "新卒",
  mid_career: "中途",
};

export const roleLabels: Record<string, string> = {
  admin: "管理者",
  employee: "社員",
  applicant: "応募者",
};

export const avatarColorByRole: Record<string, { bg: string; text: string }> = {
  employee: { bg: "bg-green-100", text: "text-green-700" },
  applicant: { bg: "bg-blue-100", text: "text-blue-700" },
  admin: { bg: "bg-purple-100", text: "text-purple-700" },
};
