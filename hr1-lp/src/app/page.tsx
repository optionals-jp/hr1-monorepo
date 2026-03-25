import {
  ArrowRight,
  Users,
  BarChart3,
  Shield,
  Clock,
  Building2,
  Zap,
  CheckCircle2,
  ChevronRight,
  Globe,
  Sparkles,
  TrendingUp,
  FileText,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { Header } from "@/components/header";
import { FadeIn } from "@/components/fade-in";

const SIGNUP_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/signup`
  : "/signup";

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-red-50/40">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-96 w-96 rounded-full bg-red-100/30 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-80 w-80 rounded-full bg-blue-50/40 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-orange-50/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 pt-20 pb-16 lg:px-8">
        <FadeIn>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-red-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            次世代の人事管理プラットフォーム
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1 className="max-w-4xl text-center text-4xl leading-tight font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            人事の
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              すべて
            </span>
            を、
            <br />
            ひとつに。
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="mt-6 max-w-2xl text-center text-base leading-relaxed text-gray-500 sm:text-lg md:text-xl">
            採用から勤怠、評価、給与まで。HR1は企業の人事業務を
            <br className="hidden sm:block" />
            一つのプラットフォームに統合し、組織の成長を加速します。
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <a
              href={SIGNUP_URL}
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-8 text-sm font-semibold text-white shadow-xl shadow-red-600/25 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-red-600/30 sm:h-14 sm:px-10 sm:text-base"
            >
              無料デモを試す
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-8 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 sm:h-14 sm:px-10 sm:text-base"
            >
              詳しく見る
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </FadeIn>

        {/* Dashboard preview */}
        <FadeIn delay={500}>
          <div className="relative mt-16 w-full max-w-5xl sm:mt-20">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-2xl shadow-gray-900/10">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="mx-auto flex h-7 w-72 items-center justify-center rounded-md bg-white px-3 text-xs text-gray-400">
                  hr1.studio/dashboard
                </div>
              </div>
              {/* Mock dashboard */}
              <div className="p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    {
                      label: "社員数",
                      value: "248",
                      sub: "+12 今月",
                      color: "text-blue-600",
                      bg: "bg-blue-50",
                    },
                    {
                      label: "応募者数",
                      value: "67",
                      sub: "+23 今月",
                      color: "text-green-600",
                      bg: "bg-green-50",
                    },
                    {
                      label: "有給取得率",
                      value: "78%",
                      sub: "前月比 +5%",
                      color: "text-orange-600",
                      bg: "bg-orange-50",
                    },
                    {
                      label: "承認待ち",
                      value: "12",
                      sub: "件",
                      color: "text-red-600",
                      bg: "bg-red-50",
                    },
                  ].map((card) => (
                    <div key={card.label} className={`rounded-xl ${card.bg} p-4`}>
                      <p className="text-xs font-medium text-gray-500">{card.label}</p>
                      <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="col-span-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-sm font-medium text-gray-700">採用パイプライン</p>
                    <div className="mt-4 flex items-end gap-2">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-to-t from-red-500 to-red-400"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-sm font-medium text-gray-700">部門別人員</p>
                    <div className="mt-4 space-y-3">
                      {[
                        { dept: "開発部", pct: 35 },
                        { dept: "営業部", pct: 25 },
                        { dept: "人事部", pct: 15 },
                        { dept: "総務部", pct: 12 },
                      ].map((d) => (
                        <div key={d.dept}>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{d.dept}</span>
                            <span>{d.pct}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                              style={{ width: `${d.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Stats ─── */
function Stats() {
  const stats = [
    { value: "500+", label: "導入企業" },
    { value: "98%", label: "顧客満足度" },
    { value: "50%", label: "工数削減" },
    { value: "24/7", label: "サポート体制" },
  ];
  return (
    <section className="relative border-y border-gray-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4 lg:px-8">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 100} className="text-center">
            <p className="bg-gradient-to-br from-red-600 to-orange-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {s.value}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-500">{s.label}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    {
      icon: Users,
      title: "採用管理",
      desc: "求人掲載から応募者管理、面接スケジュールまで。採用プロセス全体を一元管理。",
      bgColor: "bg-blue-50",
    },
    {
      icon: Clock,
      title: "勤怠管理",
      desc: "リアルタイム打刻、残業計算、有給管理。正確で効率的な勤怠管理を実現。",
      bgColor: "bg-green-50",
    },
    {
      icon: BarChart3,
      title: "人事評価",
      desc: "360度評価、目標管理、スキルマトリクス。データに基づく公正な評価制度。",
      bgColor: "bg-purple-50",
    },
    {
      icon: FileText,
      title: "給与管理",
      desc: "給与計算、明細発行、年末調整。ミスのない給与処理をサポート。",
      bgColor: "bg-orange-50",
    },
    {
      icon: MessageSquare,
      title: "社内コミュニケーション",
      desc: "メッセージ、お知らせ、FAQ、Wiki。社内情報の共有をスムーズに。",
      bgColor: "bg-pink-50",
    },
    {
      icon: CalendarDays,
      title: "シフト管理",
      desc: "希望シフト収集、自動調整、公開。複雑なシフト管理をシンプルに。",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <section
      id="features"
      className="relative bg-gradient-to-b from-white to-slate-50 py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-red-600 uppercase">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              人事業務のすべてをカバー
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              採用・勤怠・評価・給与。バラバラだった人事システムを統合し、
              <br className="hidden sm:block" />
              管理コストを大幅に削減します。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 80}>
              <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bgColor}`}
                >
                  <f.icon className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-600 opacity-0 transition-opacity group-hover:opacity-100">
                  詳しく見る <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Benefits ─── */
function Benefits() {
  const benefits = [
    {
      icon: Zap,
      title: "圧倒的な業務効率化",
      desc: "手作業の入力やExcel管理から脱却。自動化された業務フローで人事部門の工数を50%以上削減します。",
    },
    {
      icon: Shield,
      title: "セキュリティ & コンプライアンス",
      desc: "エンタープライズグレードのセキュリティ。RLS（行レベルセキュリティ）による厳密なデータアクセス制御。",
    },
    {
      icon: Globe,
      title: "マルチ組織対応",
      desc: "グループ会社や複数拠点の一括管理。組織横断でのデータ分析やレポーティングが可能。",
    },
    {
      icon: TrendingUp,
      title: "データドリブン人事",
      desc: "リアルタイムダッシュボードで組織の状態を可視化。データに基づく意思決定を支援します。",
    },
  ];

  return (
    <section id="benefits" className="relative overflow-hidden bg-gray-900 py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 h-80 w-80 rounded-full bg-red-500/5 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-red-400 uppercase">Benefits</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              HR1が選ばれる理由
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              単なる人事ツールではありません。組織の成長を加速するパートナーです。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <FadeIn key={b.title} delay={i * 100}>
              <div className="group rounded-2xl border border-gray-800 bg-gray-800/50 p-6 backdrop-blur transition-all duration-300 hover:border-gray-700 hover:bg-gray-800/80">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-600/20">
                  <b.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{b.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Flow ─── */
function Flow() {
  const steps = [
    {
      step: "01",
      title: "無料アカウント作成",
      desc: "企業情報を入力するだけ。わずか2分で始められます。",
    },
    {
      step: "02",
      title: "初期設定",
      desc: "部門構成や評価制度など、貴社に合わせた設定を行います。",
    },
    {
      step: "03",
      title: "社員データ取込",
      desc: "CSVインポートで既存データをスムーズに移行。",
    },
    {
      step: "04",
      title: "運用開始",
      desc: "充実のサポートで、安心して本番運用を開始できます。",
    },
  ];

  return (
    <section id="flow" className="relative bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-red-600 uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              かんたん4ステップで導入
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              面倒な導入作業は不要。最短即日で運用を開始できます。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <FadeIn key={s.step} delay={i * 120}>
                <div className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="absolute top-8 right-0 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-red-300 to-red-100 lg:block" />
                  )}
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-500 text-xl font-bold text-white shadow-lg shadow-red-600/20">
                    {s.step}
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const testimonials = [
    {
      quote:
        "HR1の導入で採用にかかる工数が60%削減。面接調整もスムーズになり、候補者体験も向上しました。",
      name: "田中 美咲",
      title: "人事部長",
      company: "テックイノベーション株式会社",
    },
    {
      quote:
        "勤怠管理からExcelが消えたのが一番大きい。リアルタイムで状況が把握でき、月末の集計作業がほぼゼロに。",
      name: "山田 太郎",
      title: "総務マネージャー",
      company: "グローバルサービス株式会社",
    },
    {
      quote:
        "360度評価の仕組みが素晴らしい。社員の成長を可視化でき、適切なフィードバックが可能になりました。",
      name: "佐藤 健一",
      title: "代表取締役",
      company: "クリエイトカンパニー株式会社",
    },
  ];

  return (
    <section className="relative bg-gradient-to-b from-slate-50 to-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-red-600 uppercase">
              Testimonials
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              導入企業の声
            </h2>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 100}>
              <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <svg
                      key={j}
                      className="h-4 w-4 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-gray-600">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-orange-100">
                      <Building2 className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">
                        {t.title} / {t.company}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-600 to-orange-500 py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            人事の未来を、
            <br />
            今すぐ体験しませんか？
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-red-100 sm:text-lg">
            無料デモ環境で、HR1のすべての機能をお試しいただけます。
            <br />
            クレジットカード不要。導入義務なし。
          </p>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={SIGNUP_URL}
              className="inline-flex h-14 items-center gap-2.5 rounded-full bg-white px-10 text-base font-bold text-red-600 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            >
              無料でアカウント作成
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-red-100">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              無料で試せる
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              カード不要
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              即日利用可
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500">
              <span className="text-xs font-bold text-white">H</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              HR1 <span className="font-normal text-gray-400">Studio</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="transition hover:text-gray-600">
              利用規約
            </a>
            <a href="#" className="transition hover:text-gray-600">
              プライバシーポリシー
            </a>
            <a href="#" className="transition hover:text-gray-600">
              お問い合わせ
            </a>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 HR1 Studio. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Page (Server Component) ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Benefits />
        <Flow />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
