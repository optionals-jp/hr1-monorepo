"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MessageSquare,
  ListTodo,
  CalendarDays,
} from "lucide-react";

const SERVER_ERRORS: Record<string, string> = {
  unauthorized: "このアカウントには社員ポータルへのアクセス権限がありません。",
};

/* ─── Left Panel ─── */
function LeftPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-gray-900 via-gray-900 to-gray-800 p-10 lg:flex lg:w-120 xl:w-130">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
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
        <div className="mb-16 inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <span className="text-lg font-bold text-white">
            HR1 <span className="font-normal text-gray-400">Employee</span>
          </span>
        </div>

        <h2 className="text-2xl leading-snug font-bold text-white xl:text-3xl">
          あなたの
          <span className="text-primary">はたらく</span>
          を、
          <br />
          もっとスムーズに
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-gray-400">
          出退勤・タスク・メッセージをひとつの場所で。
          <br />
          いつでもどこでもアクセスできます。
        </p>

        <div className="mt-10 space-y-5">
          {[
            { icon: Clock, text: "ワンタップで出退勤を記録" },
            { icon: ListTodo, text: "タスクの確認と進捗管理" },
            { icon: MessageSquare, text: "チームとのリアルタイムメッセージ" },
            { icon: CalendarDays, text: "スケジュールと休暇の確認" },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-800">
                <b.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-gray-300">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-12 rounded-xl border border-gray-800 bg-gray-800/50 p-5 backdrop-blur">
        <p className="text-sm leading-relaxed text-gray-300">
          &ldquo;スマホからすぐに打刻できるので、毎朝のストレスがなくなりました。&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-bold text-primary">T</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-200">田中 健太</p>
            <p className="text-xs text-gray-500">エンジニア / サンプル株式会社</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Password Login Form ─── */
function PasswordForm({
  onSwitchToOtp,
  serverError,
}: {
  onSwitchToOtp: () => void;
  serverError: string | null;
}) {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const displayError = error ?? serverError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {displayError && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            パスワード
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-60 disabled:shadow-none sm:h-13"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              ログイン中...
            </>
          ) : (
            <>
              ログイン
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-gray-400">または</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSwitchToOtp}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:h-13"
      >
        <Mail className="h-4 w-4" />
        メールでワンタイムパスワードログイン
      </button>
    </>
  );
}

/* ─── OTP Login Form ─── */
function OtpForm({
  onSwitchToPassword,
  serverError,
}: {
  onSwitchToPassword: () => void;
  serverError: string | null;
}) {
  const { signInWithOtp, verifyOtp, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInWithOtp(email);
      if (result.error) {
        setError(result.error);
      } else {
        setOtpSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyOtp(email, otpCode);
      if (result.error) setError(result.error);
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error ?? serverError;

  if (!otpSent) {
    return (
      <>
        {displayError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label htmlFor="otp-email" className="mb-1.5 block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              id="otp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-60 disabled:shadow-none sm:h-13"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                ワンタイムパスワードを送信
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onSwitchToPassword}
          className="mt-6 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          パスワードでログイン
        </button>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>{email}</strong> にワンタイムパスワードを送信しました
        </span>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerifyOtp} className="space-y-5">
        <div>
          <label htmlFor="otp-code" className="mb-1.5 block text-sm font-medium text-gray-700">
            ワンタイムパスワード（6桁）
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            required
            autoComplete="one-time-code"
            className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.5em] text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 placeholder:tracking-normal focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || otpCode.length !== 6}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-60 disabled:shadow-none sm:h-13"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              確認中...
            </>
          ) : (
            <>
              ログイン
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setOtpSent(false);
          setOtpCode("");
          setError(null);
        }}
        className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        メールアドレスを変更する
      </button>
    </>
  );
}

/* ─── Login Form Container ─── */
function LoginForm() {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [serverError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const err = new URLSearchParams(window.location.search).get("error");
    return err && SERVER_ERRORS[err] ? SERVER_ERRORS[err] : null;
  });

  return (
    <div className="flex min-h-screen flex-1 flex-col overflow-y-auto bg-white">
      {/* Mobile header */}
      <div className="flex items-center px-6 pt-6 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-white">H</span>
          </div>
          <span className="text-base font-bold text-gray-900">
            HR1 <span className="font-normal text-gray-400">Employee</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              おかえりなさい
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {mode === "password"
                ? "アカウントにログインしてください"
                : "メールアドレスにワンタイムパスワードを送信します"}
            </p>
          </div>

          {mode === "password" ? (
            <PasswordForm onSwitchToOtp={() => setMode("otp")} serverError={serverError} />
          ) : (
            <OtpForm onSwitchToPassword={() => setMode("password")} serverError={serverError} />
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              SSL暗号化通信
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              データ安全保護
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <LeftPanel />
      <LoginForm />
    </div>
  );
}
