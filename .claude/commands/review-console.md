hr1-console（Next.js テナント管理コンソール）のコードレビューを実施してください。

## 概要

hr1-console は各テナント企業向けの HR 管理コンソールです。求人管理、応募者管理、社員管理、評価、勤怠等の HR 機能を提供します。
Next.js App Router + TypeScript + Supabase + shadcn/ui で構築されています。

## 手順

1. `git diff HEAD -- hr1-console/` と `git diff origin/main...HEAD -- hr1-console/` で変更を確認する
2. 変更がある場合は変更されたファイルを全て読み込む。変更がない場合は `hr1-console/src/` 配下の全ページ・コンポーネント・hooks を対象にアプリ全体レビューを実施する
3. 以下の観点でレビューする

## レビュー観点

### 必須チェック
- **バグ・ロジックエラー**: off-by-one、null参照、型不一致、条件分岐の漏れ
- **セキュリティ**: テナント間のデータ漏洩がないか。認証/認可の漏れ、XSS、SQLインジェクション、機密情報のハードコード
- **データ整合性**: DB操作の整合性、外部キー制約、楽観的更新の整合性

### クリーンアーキテクチャ

hr1-console はクリーンアーキテクチャに基づいて設計されています。レイヤー間の依存方向と責務分離を厳密にチェックしてください。

#### レイヤー構成と責務

| レイヤー | 配置場所 | 責務 |
|---------|---------|------|
| **Presentation** | `app/`, `features/*/components/` | UI描画、ユーザー操作のハンドリング、トースト等のUI通知 |
| **Application (Hooks)** | `features/*/hooks/`, `lib/hooks/` | ユースケースのオーケストレーション、状態管理、Repository呼び出しの結合 |
| **Domain** | `features/*/types.ts`, `features/*/rules.ts`, `lib/constants/`, `types/` | 型定義、ビジネスルール（純粋関数）、定数・enum |
| **Infrastructure** | `lib/repositories/`, `lib/supabase/` | 外部サービス（Supabase）との通信、データアクセス、RPC呼び出し |

#### Hooks の分類

Hooks 層はユースケースの性質に応じて以下の3種類に分類する：

| 種類 | 責務 | 例 |
|------|------|-----|
| **Query Hook** | データ取得 + キャッシュ管理 | `useJobDetail(id)` — SWR/fetchでデータ取得 |
| **Mutation Hook** | 単一操作の実行。成功/失敗を返す | `useAddStep()`, `useReorderSteps()` |
| **Page Hook** | 画面単位で Query + Mutation + UI状態を統合 | `useJobDetailPage()` — タブ状態、ダイアログ状態等を含む |

- Query/Mutation Hook は再利用可能に設計する（特定画面に依存しない）
- Page Hook は画面固有の状態統合を行う（再利用性は求めない）
- Mutation Hook は結果（成功/エラー）を返し、UI通知（トースト等）はコンポーネント側で行う

```typescript
// ❌ NG: hooks 内でトースト表示
const { showToast } = useToast();
await repository.skipStep(stepId);
showToast("スキップしました");

// ✅ OK: 結果を返し、呼び出し元で表示
// hooks
async function skipStep(stepId: string): Promise<{ success: boolean }> {
  const { error } = await repository.skipStep(stepId);
  return { success: !error };
}
// component
const result = await skipStep(stepId);
if (result.success) showToast("スキップしました");
```

#### Domain 層の設計

Domain 層は型定義だけでなく、ビジネスルールを純粋関数として配置する：

```
features/{feature-name}/
├── types.ts    # 型定義、interface
└── rules.ts    # ビジネスルール（純粋関数、テスト可能）
```

```typescript
// features/applications/rules.ts
export function canUnskipStep(step: ApplicationStep, allSteps: ApplicationStep[]): boolean {
  return !allSteps.some(s => s.step_order > step.step_order && s.status === StepStatus.Completed);
}

export function getCurrentStepOrder(steps: ApplicationStep[]): number | null {
  const inProgress = steps.find(s => s.status === StepStatus.InProgress);
  if (inProgress) return inProgress.step_order;
  const firstPending = steps.find(s => s.status === StepStatus.Pending);
  return firstPending?.step_order ?? null;
}
```

定数・enum は `lib/constants/` に配置する。UIラベルとenum値の同居を許容する：
```
lib/constants/
  steps.ts        # StepStatus, StepType enum + 日本語ラベル
  application.ts  # ApplicationStatus enum + ラベル
```

#### Repository 層の設計

Repository はテーブル（またはドメイン集約）単位で作成する：

```
lib/repositories/
  job-repository.ts          # jobs + job_steps のデータアクセス
  application-repository.ts  # applications + application_steps のデータアクセス
  interview-repository.ts    # interviews + interview_slots のデータアクセス
```

- メソッドは CRUD + 汎用クエリ（`findByOrg`, `findById` 等）
- 関連テーブルの JOIN クエリも Repository に配置してよい
- RPC 呼び出しも Repository に配置する
- Supabase Edge Function 呼び出しも Repository に配置する（hooks から `functions.invoke()` を直接呼ばない）
- Supabase Realtime subscription の作成も Repository に配置する（hooks から `channel()` / `on()` を直接呼ばない）
- Supabase クライアントは引数で受け取る（テスト容易性のため）

```typescript
// lib/repositories/application-repository.ts
export async function skipStep(client: SupabaseClient, stepId: string) {
  return client.from("application_steps").update({ status: "skipped" }).eq("id", stepId);
}

// Realtime subscription もリポジトリに配置
export function subscribeToStepChanges(
  client: SupabaseClient, applicationId: string, onUpdate: () => void
) {
  return client.channel(`application_steps:${applicationId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "application_steps",
      filter: `application_id=eq.${applicationId}` }, onUpdate)
    .subscribe();
}
```

#### page.tsx のサイズガイドライン

- page.tsx は **hooks の呼び出し + JSX レンダリングのみ** に留める
- 目安: **300行以下**。超える場合はコンポーネント分割または hook 抽出を検討する
- useState を page.tsx 内に直接書かない。状態管理は Page Hook に集約する
- page.tsx 内にサブコンポーネント（`function SubComponent()` 等）を定義しない。`features/*/components/` に分割する
- ビジネスロジック（フィルタリング、ソート、計算）は page.tsx に書かず `rules.ts` または hooks に移す

#### 依存方向チェック（内向きのみ許可）
- ❌ **Components が Supabase を直接呼んでいないか**: コンポーネントから `createBrowserClient()` や `supabase.from()` を直接呼ばない。必ず hooks 経由にする
- ❌ **Hooks が UI ライブラリに依存していないか**: hooks 内で `useToast` / `showToast` を呼ばない。JSX を返さない。DOM 操作をしない
- ❌ **Hooks が Supabase を直接呼んでいないか**: hooks は Repository 経由で DB アクセスする
- ❌ **Types / Rules が外部ライブラリに依存していないか**: ドメイン型・ルールが Supabase の型やUIライブラリの型に直接依存しない
- ✅ **Components → Hooks → Repository → Supabase** の依存方向が守られているか

#### 責務分離チェック
- **コンポーネントにビジネスロジックが混入していないか**: フィルタリング、ソート、計算、バリデーション等のロジックは rules.ts または hooks に移す
- **hooks に UI 関心事が混入していないか**: Mutation Hook は結果を返すのみ。トースト・モーダル制御はコンポーネント側
- **repository が汎用的な設計か**: 特定の画面専用のクエリになっていないか

#### Feature モジュールの構成チェック
```
features/{feature-name}/
├── components/   # Presentation: UI コンポーネント
├── hooks/        # Application: Query / Mutation / Page hooks
├── types.ts      # Domain: 型定義
└── rules.ts      # Domain: ビジネスルール（純粋関数）
```
- 各 feature が上記の構成に従っているか
- feature 間の直接依存: `import type` による型参照は許可する。hooks / components の直接参照は禁止。共通ロジックは `lib/` に配置する
- 新しい feature を追加する場合、既存の構成パターンに従っているか

### コード品質
- **命名**: 変数・関数名が処理内容を適切に表しているか
- **重複**: 同じロジックがコピペされていないか（特に feature 間）
- **未使用コード**: import や variable が使われずに残っていないか
- **エラーハンドリング**: 適切にエラーが処理されているか（過剰なハンドリングは不要）

### Next.js / React 固有
- **"use client" / Server Components**: リアルタイム更新やインタラクティブな画面は `"use client"` を使用してよい。静的な表示のみの画面は Server Component を優先する
- **React Hooks**: useEffect の依存配列が正しいか、不要な useEffect がないか
- **再レンダリング**: 不要な再レンダリングを引き起こす実装がないか（オブジェクトリテラルの直接渡し、useCallback/useMemo の欠如等）

### Supabase クライアント
- **SSR クライアント**: `@supabase/ssr` 経由（`createBrowserClient` / `createServerClient`）で使用しているか
- **テナント分離**: クエリに適切なテナントフィルタが含まれているか（org_id）
- **型定義**: `src/types/database.ts` との整合性
- **RLS 依存**: クライアント側でのフィルタだけでなく、RLS ポリシーでも保護されているか

### UI / スタイリング
- **UIテキスト**: 日本語が適切か（テナント管理者向けの表現になっているか）
- **shadcn/ui**: 共通コンポーネント（Card, Table, Badge, Dialog 等）を適切に使用しているか。独自実装で再発明していないか
- **Tailwind CSS**: 任意値クラス（`w-[347px]`）ではなく標準クラスを優先しているか
- **レスポンシブ**: 主要な画面がモバイル表示で崩れないか

### ビルド・Lint チェック
- レビュー完了後、`cd hr1-console && npm run format && npm run lint && npm run test && npm run build` を実行し、エラーがないか確認する

## 出力フォーマット

レビュー結果を以下の形式で報告してください：

### 🔴 要修正（マージ前に修正が必要）
### 🟡 推奨（修正を推奨するが必須ではない）
### 🟢 良い点（特に良い実装）

各項目には **ファイル名:行番号** と **理由** を明記してください。

問題がない場合は「レビュー完了：問題なし ✅」と報告してください。
