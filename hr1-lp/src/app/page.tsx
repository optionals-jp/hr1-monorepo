import {
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  ChevronRight,
  Globe,
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  Check,
} from "lucide-react";
import { Header } from "@/components/header";
import { FadeIn } from "@/components/fade-in";
import { FaqItem } from "@/components/faq-item";
import { features } from "@/data/features";

const SIGNUP_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/signup`
  : "/signup";

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      {/* Subtle geometric background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-pulse-glow absolute top-32 right-[15%] h-125 w-125 rounded-full bg-red-100/40 blur-[100px]" />
        <div className="animate-pulse-glow absolute bottom-20 left-[10%] h-100 w-100 rounded-full bg-blue-50/50 blur-[100px]" style={{ animationDelay: "2s" }} />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(circle, #000 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 pt-24 pb-20">
        <FadeIn>
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            モバイル・Web・デスクトップ対応
          </div>
        </FadeIn>

        <FadeIn delay={80}>
          <h1 className="text-balance max-w-3xl text-center text-3xl leading-tight font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            人事の
            <span className="bg-linear-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
              すべて
            </span>
            を、
            <br className="hidden sm:block" />
            ひとつに。
          </h1>
        </FadeIn>

        <FadeIn delay={160}>
          <p className="mt-6 max-w-xl text-center text-base leading-relaxed text-gray-500 sm:text-lg">
            採用から勤怠、評価、給与まで。
            <br className="hidden sm:block" />
            HR1は人事業務を一つのプラットフォームに統合し、
            <br className="hidden sm:block" />
            組織の成長を加速します。
          </p>
        </FadeIn>

        <FadeIn delay={240}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href={SIGNUP_URL}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gray-900 px-7 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition-all hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-xl sm:h-13"
            >
              無料で始める
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-7 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 sm:h-13"
            >
              詳しく見る
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={400}>
          <p className="mt-6 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              無料プランあり
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              カード不要
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              即日利用可
            </span>
          </p>
        </FadeIn>

        {/* Dashboard preview */}
        <FadeIn delay={500}>
          <div className="relative mt-16 w-full max-w-4xl">
            <div className="absolute -inset-px rounded-2xl bg-linear-to-b from-gray-200 to-gray-100" />
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-900/5">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                </div>
                <div className="mx-auto flex h-6 w-56 items-center justify-center rounded-md bg-gray-50 text-[11px] text-gray-400">
                  app.hr1.studio/dashboard
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "社員数", value: "248", sub: "+12 今月", accent: "text-blue-600", dot: "bg-blue-500" },
                    { label: "応募者数", value: "67", sub: "+23 今月", accent: "text-emerald-600", dot: "bg-emerald-500" },
                    { label: "有給取得率", value: "78%", sub: "前月比 +5%", accent: "text-amber-600", dot: "bg-amber-500" },
                    { label: "承認待ち", value: "12", sub: "件", accent: "text-red-600", dot: "bg-red-500" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border border-gray-100 p-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${card.dot}`} />
                        <p className="text-[11px] font-medium text-gray-400">{card.label}</p>
                      </div>
                      <p className={`mt-1.5 text-xl font-bold ${card.accent}`}>{card.value}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{card.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2 rounded-xl border border-gray-100 p-3 sm:p-4">
                    <p className="text-xs font-medium text-gray-500">採用パイプライン</p>
                    <div className="mt-4 flex items-end gap-1.5">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-linear-to-t from-red-500 to-red-400 opacity-80"
                          style={{ height: `${h * 0.7}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-medium text-gray-500">部門別人員</p>
                    <div className="mt-4 space-y-2.5">
                      {[
                        { dept: "開発部", pct: 35 },
                        { dept: "営業部", pct: 25 },
                        { dept: "人事部", pct: 15 },
                        { dept: "総務部", pct: 12 },
                      ].map((d) => (
                        <div key={d.dept}>
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>{d.dept}</span>
                            <span>{d.pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-red-500 to-red-400"
                              style={{ width: `${d.pct * 2.5}%` }}
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
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 80} className="text-center">
            <p className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {s.value}
            </p>
            <p className="mt-1.5 text-sm text-gray-400">{s.label}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  return (
    <section id="features" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              人事業務のすべてをカバー
            </h2>
            <p className="mt-4 text-base text-gray-500">
              バラバラだった人事システムを統合し、管理コストを大幅に削減します。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 60}>
              <a
                href={`/features/${f.slug}`}
                className="group block rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-900/5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 transition-colors group-hover:bg-red-50">
                  <f.icon className="h-5 w-5 text-gray-500 transition-colors group-hover:text-red-600" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-600 opacity-0 transition-opacity group-hover:opacity-100">
                  詳しく見る <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Multi-platform ─── */
function MultiPlatform() {
  const platforms = [
    {
      icon: Smartphone,
      title: "iOS / Android",
      desc: "ネイティブアプリで快適な操作体験。プッシュ通知でリアルタイムに情報をキャッチ。",
      badge: "Native App",
    },
    {
      icon: Monitor,
      title: "Webブラウザ",
      desc: "インストール不要。あらゆるブラウザから管理画面にアクセス可能。",
      badge: "Web App",
    },
    {
      icon: Tablet,
      title: "タブレット / デスクトップ",
      desc: "レスポンシブ対応で、あらゆる画面サイズに最適化された体験を提供。",
      badge: "Responsive",
    },
  ];

  return (
    <section className="bg-[#fafafa] py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">
              Multi-Platform
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              あらゆるデバイスで、
              <br className="hidden sm:block" />
              シームレスに
            </h2>
            <p className="mt-4 text-base text-gray-500">
              モバイルネイティブアプリを中心に、Web・デスクトップにも完全対応。
              <br className="hidden sm:block" />
              場所やデバイスを選ばず、いつでも人事業務を管理できます。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
          {platforms.map((p, i) => (
            <FadeIn key={p.title} delay={i * 100}>
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/5">
                <div className="mb-1 inline-block rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                  {p.badge}
                </div>
                <div className="mt-4 mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <p.icon className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{p.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={300}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs sm:text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              iOS / Android ネイティブ
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              リアルタイム同期
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              オフライン対応
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              プッシュ通知
            </span>
          </div>
        </FadeIn>
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
      desc: "手作業の入力やExcel管理から脱却。自動化された業務フローで人事部門の工数を50%以上削減。",
    },
    {
      icon: Shield,
      title: "セキュリティ & コンプライアンス",
      desc: "エンタープライズグレードのセキュリティ。行レベルのアクセス制御で厳密なデータ保護を実現。",
    },
    {
      icon: Globe,
      title: "マルチ組織対応",
      desc: "グループ会社や複数拠点の一括管理。組織横断でのデータ分析やレポーティングが可能。",
    },
    {
      icon: TrendingUp,
      title: "データドリブン人事",
      desc: "リアルタイムダッシュボードで組織の状態を可視化。データに基づく意思決定を支援。",
    },
  ];

  return (
    <section id="benefits" className="bg-gray-950 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase">Benefits</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              HR1が選ばれる理由
            </h2>
            <p className="mt-4 text-base text-gray-400">
              単なる人事ツールではなく、組織の成長を加速するパートナーです。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <FadeIn key={b.title} delay={i * 80}>
              <div className="rounded-2xl border border-gray-800/80 bg-gray-900/50 p-5 sm:p-6 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/80">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10">
                  <b.icon className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-[15px] font-bold text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{b.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "300",
      unit: "/ 人 / 月",
      desc: "20名以下の小規模チーム向け",
      features: ["勤怠管理", "社員名簿", "お知らせ・FAQ", "モバイルアプリ", "メールサポート"],
      cta: "無料で始める",
      featured: false,
    },
    {
      name: "Standard",
      price: "500",
      unit: "/ 人 / 月",
      desc: "80名以下の成長企業向け",
      features: [
        "Starterの全機能",
        "採用管理（ATS）",
        "360度評価",
        "ワークフロー",
        "サーベイ",
        "優先サポート",
      ],
      cta: "無料で始める",
      featured: true,
    },
    {
      name: "Premium",
      price: "800",
      unit: "/ 人 / 月",
      desc: "大規模組織向け（人数制限なし）",
      features: [
        "Standardの全機能",
        "監査ログ",
        "法令ガイド",
        "API連携",
        "専任サポート",
        "SLA保証",
      ],
      cta: "お問い合わせ",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">Pricing</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              シンプルで透明な料金体系
            </h2>
            <p className="mt-4 text-base text-gray-500">
              初期費用なし。使った分だけのシンプルな従量課金。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 100}>
              <div
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                  plan.featured
                    ? "border-gray-900 bg-gray-950 text-white shadow-2xl shadow-gray-900/20"
                    : "border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-900/5"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 right-6 rounded-full bg-red-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                    人気
                  </div>
                )}
                <div>
                  <h3
                    className={`text-sm font-semibold ${plan.featured ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-lg text-gray-400">¥</span>
                    <span
                      className={`text-3xl font-extrabold sm:text-4xl ${plan.featured ? "text-white" : "text-gray-900"}`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm ${plan.featured ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {plan.unit}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm ${plan.featured ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {plan.desc}
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.featured ? "text-red-400" : "text-green-500"
                        }`}
                      />
                      <span
                        className={`text-sm ${plan.featured ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href={SIGNUP_URL}
                  className={`mt-6 flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    plan.featured
                      ? "bg-white text-gray-900 hover:bg-gray-100"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                </a>
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
    { step: "01", title: "無料アカウント作成", desc: "企業情報を入力するだけ。わずか2分で始められます。" },
    { step: "02", title: "初期設定", desc: "部門構成や評価制度など、貴社に合わせた設定を行います。" },
    { step: "03", title: "社員データ取込", desc: "CSVインポートで既存データをスムーズに移行。" },
    { step: "04", title: "運用開始", desc: "充実のサポートで、安心して本番運用を開始。" },
  ];

  return (
    <section id="flow" className="bg-[#fafafa] py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              かんたん4ステップで導入
            </h2>
            <p className="mt-4 text-base text-gray-500">
              面倒な導入作業は不要。最短即日で運用を開始できます。
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <FadeIn key={s.step} delay={i * 100}>
                <div className="text-center">
                  <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-lg font-bold text-white">
                    {s.step}
                    {i < steps.length - 1 && (
                      <div className="absolute top-1/2 -right-3 hidden h-px w-6 bg-gray-300 lg:block" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{s.title}</h3>
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
      quote: "HR1の導入で採用にかかる工数が60%削減。面接調整もスムーズになり、候補者体験も向上しました。",
      name: "田中 美咲",
      title: "人事部長",
      company: "テックイノベーション株式会社",
    },
    {
      quote: "勤怠管理からExcelが消えたのが一番大きい。リアルタイムで状況が把握でき、月末の集計作業がほぼゼロに。",
      name: "山田 太郎",
      title: "総務マネージャー",
      company: "グローバルサービス株式会社",
    },
    {
      quote: "360度評価の仕組みが素晴らしい。社員の成長を可視化でき、適切なフィードバックが可能になりました。",
      name: "佐藤 健一",
      title: "代表取締役",
      company: "クリエイトカンパニー株式会社",
    },
  ];

  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">
              Testimonials
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              導入企業の声
            </h2>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-gray-100 p-4 sm:p-6">
                <p className="flex-1 text-sm leading-relaxed text-gray-600">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {t.title} / {t.company}
                    </p>
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

/* ─── FAQ ─── */
function FAQ() {
  const items = [
    {
      q: "無料プランはありますか？",
      a: "はい。Starterプランは5名まで無料でご利用いただけます。クレジットカードの登録も不要です。",
    },
    {
      q: "導入にどのくらい時間がかかりますか？",
      a: "アカウント作成から基本設定まで最短10分。CSVインポートで既存データを取り込めば、即日運用を開始できます。",
    },
    {
      q: "既存の人事システムからの移行は可能ですか？",
      a: "CSVインポート機能で社員データ、勤怠データ等を一括取込できます。移行サポートも無料で提供しています。",
    },
    {
      q: "セキュリティ対策はどうなっていますか？",
      a: "行レベルセキュリティ（RLS）による厳密なアクセス制御、通信の暗号化、定期的なセキュリティ監査を実施しています。",
    },
    {
      q: "モバイルアプリはありますか？",
      a: "iOS / Android のネイティブアプリを提供しています。勤怠打刻、承認申請、社内通知などをスマートフォンから操作できます。",
    },
    {
      q: "契約期間の縛りはありますか？",
      a: "月額契約で、いつでも解約可能です。年間契約を選択いただくと、10%の割引が適用されます。",
    },
  ];

  return (
    <section id="faq" className="bg-[#fafafa] py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">FAQ</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              よくある質問
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="mt-14">
            {items.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section className="bg-gray-950 py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <FadeIn>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            人事の未来を、
            <br />
            今すぐ体験しませんか？
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base text-gray-400">
            無料でアカウントを作成して、HR1のすべての機能をお試しください。
          </p>
        </FadeIn>

        <FadeIn delay={150}>
          <a
            href={SIGNUP_URL}
            className="mt-10 inline-flex h-13 items-center gap-2 rounded-xl bg-white px-8 text-sm font-bold text-gray-900 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
          >
            無料でアカウント作成
            <ArrowRight className="h-4 w-4" />
          </a>
        </FadeIn>

        <FadeIn delay={250}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              無料プランあり
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
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900">
              <span className="text-[10px] font-extrabold text-white">H</span>
            </div>
            <span className="text-sm font-bold text-gray-900">HR1</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-gray-400">
            <a href="#" className="transition hover:text-gray-600">利用規約</a>
            <a href="#" className="transition hover:text-gray-600">プライバシー</a>
            <a href="#" className="transition hover:text-gray-600">お問い合わせ</a>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 HR1 Inc.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <MultiPlatform />
        <Benefits />
        <Pricing />
        <Flow />
        <Testimonials />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
