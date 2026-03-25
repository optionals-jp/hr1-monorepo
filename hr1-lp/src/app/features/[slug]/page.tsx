import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Check } from "lucide-react";
import { features, getFeatureBySlug } from "@/data/features";
import { FadeIn } from "@/components/fade-in";

const SIGNUP_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/signup`
  : "/signup";

export function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return {};
  return {
    title: `${feature.title} | HR1`,
    description: feature.heroDesc,
  };
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  const Icon = feature.icon;
  const currentIndex = features.findIndex((f) => f.slug === slug);
  const prevFeature = currentIndex > 0 ? features[currentIndex - 1] : null;
  const nextFeature =
    currentIndex < features.length - 1 ? features[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a
            href="/#features"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            機能一覧に戻る
          </a>
          <a
            href={SIGNUP_URL}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-[12px] font-medium text-white transition-all hover:bg-gray-800"
          >
            無料で始める
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#fafafa] pt-28 pb-20 lg:pt-36 lg:pb-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-20 right-[20%] h-100 w-100 rounded-full bg-red-50/60 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Icon className="h-7 w-7 text-red-600" />
            </div>
          </FadeIn>
          <FadeIn delay={80}>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 whitespace-pre-line sm:text-4xl lg:text-5xl">
              {feature.heroTitle}
            </h1>
          </FadeIn>
          <FadeIn delay={160}>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
              {feature.heroDesc}
            </p>
          </FadeIn>
          <FadeIn delay={240}>
            <a
              href={SIGNUP_URL}
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-gray-900 px-7 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition-all hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-xl"
            >
              無料で試してみる
              <ArrowRight className="h-4 w-4" />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 py-10 sm:gap-8 sm:px-6 sm:py-12">
          {feature.highlights.map((h, i) => (
            <FadeIn key={h.label} delay={i * 80} className="text-center">
              <p className="text-2xl font-extrabold text-gray-900 sm:text-4xl">
                {h.value}
              </p>
              <p className="mt-1 text-sm text-gray-400">{h.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">
                Capabilities
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                主な機能
              </h2>
            </div>
          </FadeIn>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feature.capabilities.map((cap, i) => (
              <FadeIn key={cap.title} delay={i * 60}>
                <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 transition-all duration-300 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-900/5">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 sm:text-[15px]">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {cap.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-[#fafafa] py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <FadeIn>
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">
                Use Cases
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                こんな課題を解決します
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="mt-12 rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-8">
              <ul className="space-y-4">
                {feature.useCases.map((uc) => (
                  <li key={uc} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span className="text-sm text-gray-700 sm:text-[15px]">{uc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 py-20 lg:py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              {feature.title}を、今すぐ体験
            </h2>
            <p className="mt-4 text-base text-gray-400">
              無料でアカウントを作成して、すべての機能をお試しください。
            </p>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={SIGNUP_URL}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-gray-900 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                無料でアカウント作成
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                無料プランあり
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                カード不要
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                即日利用可
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Navigation */}
      <section className="border-t border-gray-100 bg-white py-6 sm:py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6">
          {prevFeature ? (
            <a
              href={`/features/${prevFeature.slug}`}
              className="group flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-900 sm:gap-2 sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{prevFeature.title}</span>
              <span className="sm:hidden">前へ</span>
            </a>
          ) : (
            <div />
          )}
          <a
            href="/#features"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-900 sm:text-sm"
          >
            機能一覧
          </a>
          {nextFeature ? (
            <a
              href={`/features/${nextFeature.slug}`}
              className="group flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-900 sm:gap-2 sm:text-sm"
            >
              <span className="hidden sm:inline">{nextFeature.title}</span>
              <span className="sm:hidden">次へ</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
            </a>
          ) : (
            <div />
          )}
        </div>
      </section>
    </div>
  );
}
