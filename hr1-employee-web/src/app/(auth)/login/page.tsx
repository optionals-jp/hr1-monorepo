"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";

function OtpLoginForm() {
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serverError = params.get("error");
    if (serverError === "unauthorized") {
      setError("このアカウントには社員ポータルへのアクセス権限がありません。");
    }
  }, []);

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

  if (!otpSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-white">H</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">HR1 Employee</h1>
            <p className="mt-2 text-sm text-gray-500">
              メールアドレスでログインしてください
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label
                htmlFor="otp-email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
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
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60"
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            コードを入力
          </h1>
        </div>

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
            <label
              htmlFor="otp-code"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
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
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60"
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
          className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          メールアドレスを変更する
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <OtpLoginForm />;
}
