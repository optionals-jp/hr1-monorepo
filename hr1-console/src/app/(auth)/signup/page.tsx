"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/browser";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  BarChart3,
  Shield,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

/* ─── Types ─── */
interface FormData {
  companyName: string;
  industry: string;
  employeeCount: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  password: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

const INDUSTRIES = [
  "IT・通信",
  "メーカー・製造",
  "商社",
  "サービス",
  "マスコミ",
  "金融",
  "不動産・建設",
  "医療・福祉",
  "教育",
  "官公庁・団体",
  "小売・飲食",
  "物流・運輸",
  "エネルギー",
  "コンサルティング",
  "その他",
];

const EMPLOYEE_COUNTS = [
  "1〜10名",
  "11〜50名",
  "51〜100名",
  "101〜300名",
  "301〜1,000名",
  "1,001〜5,000名",
  "5,001名以上",
];

/* ─── Validation ─── */
function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.companyName.trim()) errors.companyName = "会社名を入力してください";
  if (!data.industry) errors.industry = "業種を選択してください";
  if (!data.employeeCount) errors.employeeCount = "従業員数を選択してください";
  if (!data.lastName.trim()) errors.lastName = "姓を入力してください";
  if (!data.firstName.trim()) errors.firstName = "名を入力してください";
  if (!data.email.trim()) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "正しいメールアドレスを入力してください";
  }
  if (!data.phone.trim()) {
    errors.phone = "電話番号を入力してください";
  }
  if (!data.password) {
    errors.password = "パスワードを入力してください";
  } else if (data.password.length < 8) {
    errors.password = "パスワードは8文字以上で入力してください";
  }
  return errors;
}

/* ─── Input Component ─── */
function FormInput({
  label,
  required,
  error,
  ...props
}: {
  label: string;
  required?: boolean;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:ring-2 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-gray-300 focus:border-red-400 focus:ring-red-100"
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ─── Select Component ─── */
function FormSelect({
  label,
  required,
  error,
  options,
  placeholder,
  ...props
}: {
  label: string;
  required?: boolean;
  error?: string;
  options: string[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <select
        className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-gray-300 focus:border-red-400 focus:ring-red-100"
        } ${!props.value ? "text-gray-400" : ""}`}
        {...props}
      >
        <option value="">{placeholder || "選択してください"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ─── Left Panel (Benefits) ─── */
function LeftPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-10 lg:flex lg:w-[480px] xl:w-[520px]">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-orange-500/5 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative">
        {/* Logo */}
        <Link href="/lp" className="mb-16 inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-600/20">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <span className="text-lg font-bold text-white">
            HR1 <span className="font-normal text-gray-400">Studio</span>
          </span>
        </Link>

        <h2 className="text-2xl leading-snug font-bold text-white xl:text-3xl">
          人事の
          <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            すべて
          </span>
          を、
          <br />
          無料でお試しください
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-gray-400">
          デモ環境でHR1のすべての機能を体験できます。
          <br />
          クレジットカード不要。いつでもキャンセル可能。
        </p>

        {/* Benefits */}
        <div className="mt-10 space-y-5">
          {[
            { icon: Users, text: "採用・社員管理をワンストップで" },
            { icon: BarChart3, text: "リアルタイムダッシュボードで組織を可視化" },
            { icon: Shield, text: "エンタープライズ級のセキュリティ" },
            { icon: Building2, text: "マルチ組織対応で拡張性抜群" },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-800">
                <b.icon className="h-4 w-4 text-red-400" />
              </div>
              <span className="text-sm text-gray-300">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom testimonial */}
      <div className="relative mt-12 rounded-xl border border-gray-800 bg-gray-800/50 p-5 backdrop-blur">
        <p className="text-sm leading-relaxed text-gray-300">
          &ldquo;導入初日からチーム全員が使いこなせました。UIが直感的で、研修コストがほぼゼロです。&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-orange-100">
            <Building2 className="h-3.5 w-3.5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-200">鈴木 美穂</p>
            <p className="text-xs text-gray-500">HR部門マネージャー / ABC株式会社</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Signup Form ─── */
function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    industry: "",
    employeeCount: "",
    lastName: "",
    firstName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (!agreed) {
      setServerError("利用規約に同意してください");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabase();

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: `${formData.lastName} ${formData.firstName}`,
            phone: formData.phone,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setServerError("このメールアドレスは既に登録されています。ログインしてください。");
        } else {
          setServerError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setServerError("アカウントの作成に失敗しました。もう一度お試しください。");
        return;
      }

      // 2. Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.companyName,
          industry: formData.industry,
          employee_count: formData.employeeCount,
        })
        .select("id")
        .single();

      if (orgError) {
        setServerError("組織の作成に失敗しました: " + orgError.message);
        return;
      }

      // 3. Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: formData.email,
        display_name: `${formData.lastName} ${formData.firstName}`,
        phone: formData.phone,
        role: "admin",
      });

      if (profileError) {
        setServerError("プロフィールの作成に失敗しました: " + profileError.message);
        return;
      }

      // 4. Link user to organization
      const { error: linkError } = await supabase.from("user_organizations").insert({
        user_id: authData.user.id,
        organization_id: org.id,
      });

      if (linkError) {
        setServerError("組織への紐付けに失敗しました: " + linkError.message);
        return;
      }

      // 5. Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        // Signup succeeded but auto-login failed — redirect to login
        router.push("/login");
        return;
      }

      // Success — redirect to dashboard
      router.push("/");
    } catch {
      setServerError("予期しないエラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col overflow-y-auto bg-white">
      {/* Mobile header */}
      <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
        <Link href="/lp" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500">
            <span className="text-xs font-bold text-white">H</span>
          </div>
          <span className="text-base font-bold text-gray-900">
            HR1 <span className="font-normal text-gray-400">Studio</span>
          </span>
        </Link>
        <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700">
          ログイン
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-lg">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/lp"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-gray-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              トップに戻る
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              無料アカウント作成
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              企業情報を入力して、HR1のデモ環境をお試しください。
            </p>
          </div>

          {/* Error */}
          {serverError && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company section */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Building2 className="h-4 w-4 text-gray-400" />
                企業情報
              </h2>
              <div className="space-y-4">
                <FormInput
                  label="会社名"
                  required
                  placeholder="例: 株式会社サンプル"
                  value={formData.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  error={errors.companyName}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect
                    label="業種"
                    required
                    options={INDUSTRIES}
                    value={formData.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    error={errors.industry}
                  />
                  <FormSelect
                    label="従業員数"
                    required
                    options={EMPLOYEE_COUNTS}
                    value={formData.employeeCount}
                    onChange={(e) => updateField("employeeCount", e.target.value)}
                    error={errors.employeeCount}
                  />
                </div>
              </div>
            </div>

            {/* Personal section */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Users className="h-4 w-4 text-gray-400" />
                管理者情報
              </h2>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    label="姓"
                    required
                    placeholder="田中"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    error={errors.lastName}
                  />
                  <FormInput
                    label="名"
                    required
                    placeholder="太郎"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    error={errors.firstName}
                  />
                </div>
                <FormInput
                  label="メールアドレス"
                  required
                  type="email"
                  placeholder="taro.tanaka@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />
                <FormInput
                  label="電話番号"
                  required
                  type="tel"
                  placeholder="03-1234-5678"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  error={errors.phone}
                  autoComplete="tel"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    パスワード<span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`block w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:ring-2 ${
                        errors.password
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-gray-300 focus:border-red-400 focus:ring-red-100"
                      }`}
                      placeholder="8文字以上"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Agreement */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="agree" className="text-xs leading-relaxed text-gray-500">
                <a href="#" className="font-medium text-red-600 hover:underline">
                  利用規約
                </a>
                および
                <a href="#" className="font-medium text-red-600 hover:underline">
                  プライバシーポリシー
                </a>
                に同意します。
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:shadow-xl hover:shadow-red-600/30 disabled:opacity-60 disabled:shadow-none sm:h-13"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  無料でアカウント作成
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            すでにアカウントをお持ちですか？{" "}
            <Link href="/login" className="font-medium text-red-600 hover:underline">
              ログイン
            </Link>
          </p>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              SSL暗号化通信
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              データ安全保護
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              いつでも解約可能
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      <LeftPanel />
      <SignupForm />
    </div>
  );
}
