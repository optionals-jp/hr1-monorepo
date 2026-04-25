# CLAUDE.md

## Project Structure

Monorepo with the following apps and packages:

### Apps
- `hr1-console/` — Next.js (App Router) テナント管理コンソール (TypeScript, port 3000)
  - **対象**: テナント企業の管理者（人事部長・マネージャー等）
  - **役割**: 社員管理・勤怠管理・評価・給与・CRM・採用など、組織全体の管理業務を行う画面
  - **主要ルート**: employees, attendance, evaluations, payslips, crm, shifts, surveys, workflows, announcements, wiki, tasks, projects, calendar, faqs, compliance, audit-logs, leave, departments, settings, dashboard-edit
- `hr1-employee-web/` — Next.js (App Router) 社員向けWebアプリ (TypeScript, port 3003)
  - **対象**: テナント企業の一般社員
  - **役割**: 社員が自分の情報を確認・申請するセルフサービス画面
  - **主要ルート**: my-attendance, my-leave, payslips, profile, messages, notifications, crm, tasks, wiki, announcements, surveys, workflows, calendar, faqs, jobs, applicants, applications, scheduling, service-requests, evaluation-cycles, evaluation-templates, forms, selection-steps, shifts, compliance, employees, projects, dashboard
- `hr1-admin/` — Next.js (App Router) HR1運営管理画面 (TypeScript, port 3001)
  - **対象**: HR1プラットフォーム運営者（SaaS提供側）
  - **役割**: テナント企業の契約・プラン・MRR等を管理するプラットフォーム運営画面
  - **主要ルート**: contracts, plans, organizations
- `hr1-lp/` — Next.js (App Router) ランディングページ (TypeScript, port 3002)
  - **対象**: 一般公開（見込み顧客向け）
  - **役割**: HR1サービスの紹介・問い合わせページ（テスト・Vitest なし）
- `hr1-employee-app/` — Flutter 社員向けモバイルアプリ (Dart)
  - **対象**: テナント企業の一般社員（hr1-employee-web のモバイル版）
  - **役割**: 勤怠打刻・給与明細確認・各種申請などをモバイルから行う
- `hr1-applicant-app/` — Flutter 応募者向けモバイルアプリ (Dart)
  - **対象**: 求職者・応募者
  - **役割**: 求人検索・応募・選考状況確認・メッセージ等を行うアプリ

### Shared / Other
- `packages/shared-ui/` — Next.js 共有UIパッケージ (@hr1/shared-ui) — Button, Card, Dialog 等の基本コンポーネント
- `hr1_shared/` — Flutter shared package (Dart) — 両Flutterアプリ共通のウィジェット・定数・サービス
- `supabase/` — Supabase migrations / Edge Functions
- `scripts/` — ビルド・デプロイ用スクリプト
- `docs/` — 設計ドキュメント・調査資料
- `samples/` — サンプルデータ（CSV等）

npm workspaces でモノレポ管理（ルートに package.json）。Next.js アプリは `@hr1/shared-ui` から共通コンポーネントを import する。

Backend: Supabase (Auth, Database, Edge Functions)
Deploy: Console/Admin/Employee-Web/LP → Vercel (main merge), Mobile → TestFlight (manual via `./scripts/build-all-ipa.sh`)

## App Selection Guide（対象アプリ判定ルール）

ユーザーの指示で対象アプリが不明な場合は、**必ず確認してから作業を開始する**。推測で作業を始めない。

| キーワード・文脈 | 対象アプリ |
|----------------|-----------|
| 「管理画面」「社員管理」「テナント管理」「管理者が〇〇する」 | hr1-console |
| 「社員向け」「マイページ」「自分の勤怠」「セルフサービス」「社員が〇〇する」 | hr1-employee-web |
| 「運営」「契約管理」「プラン管理」「MRR」「テナント一覧」 | hr1-admin |
| 「LP」「ランディングページ」「サービスサイト」「問い合わせ」 | hr1-lp |
| 「モバイル」「Flutter」「アプリ」+ 社員向け | hr1-employee-app |
| 「応募者」「求人」「応募」「選考」+ モバイル | hr1-applicant-app |

**重要**: CRM、タスク、Wiki、勤怠、給与、カレンダーなどの機能は複数アプリに存在する。
- **console 側** = 管理者が組織全体のデータを管理する（他者の勤怠を承認、社員の評価を管理等）
- **employee-web 側** = 社員が自分のデータを確認・申請する（自分の勤怠を打刻、自分の給与を確認等）

ポート番号も判断材料になる: 3000=console, 3001=admin, 3002=lp, 3003=employee-web

## Commands

### hr1-console (run from `hr1-console/`)
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run format` — Prettier format (write)
- `npm run format:check` — Prettier format check
- `npm run test` — Vitest run
- `npm run test:watch` — Vitest watch
- `npm run test:e2e` — Playwright E2E test

### hr1-admin (run from `hr1-admin/`)
- `npm run dev` — Start dev server (port 3001)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run format` — Prettier format (write)
- `npm run format:check` — Prettier format check
- `npm run test` — Vitest run
- `npm run test:watch` — Vitest watch

### hr1-employee-web (run from `hr1-employee-web/`)
- `npm run dev` — Start dev server (port 3003)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run format` — Prettier format (write)
- `npm run format:check` — Prettier format check
- `npm run test` — Vitest run
- `npm run test:watch` — Vitest watch

### hr1-lp (run from `hr1-lp/`)
- `npm run dev` — Start dev server (port 3002)
- `npm run build` — Production build
- `npm run lint` — Lint (next lint)
- `npm run format` — Prettier format (write)
- `npm run format:check` — Prettier format check
- ※ test / test:watch は未設定

### Flutter apps (run from each app directory)
- `flutter pub get` — Install dependencies
- `flutter run` — Run app
- `flutter build` — Build app
- `dart format --set-exit-if-changed .` — Format check (CI enforced)
- `flutter analyze` — Static analysis (CI enforced, warning/info も失敗扱い)
- `flutter test` — Run tests

## Supabase Safety Rules（絶対遵守）

- **auth スキーマへの直接 SQL 操作は絶対禁止**: `auth.users` / `auth.identities` への INSERT/UPDATE/DELETE を直接実行しない。GoTrue の内部エラーで全ユーザーのログインが壊れる。ユーザー作成は Supabase Dashboard または `supabase.auth.admin` API のみ使用する。
- **profiles RLS ポリシーで profiles を直接参照しない**: `USING ((SELECT role FROM profiles ...) = 'xxx')` は無限再帰を引き起こす。必ず `USING (public.get_my_role() = 'xxx')` のように SECURITY DEFINER ヘルパー関数を使う。
- **DB スキーマ変更はマイグレーションファイル経由**: 本番 DB への DDL/DML 変更は `supabase/migrations/` にファイルとして記録し、レビュー後に適用する。MCP/Studio から直接 DDL を流すと migration ファイルとの drift が発生する。

## Migration / RLS 設計ガイドライン（必ず守る）

- **auth.uid() は必ず `::text` でキャスト**: `profiles.id` / `user_organizations.user_id` 等の text カラムと比較する場合は `auth.uid()::text` と書く。`auth.uid()` (uuid) と `text` の比較は PostgreSQL で暗黙キャストされず "operator does not exist: text = uuid" エラーになる、あるいはサイレント失敗する。
- **マルチ組織前提の `LIMIT 1` を禁止**: `(SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text LIMIT 1)` は複数組織所属ユーザーで壊れる。必ず `organization_id IN (SELECT public.get_my_organization_ids())` を使う。
- **RLS ヘルパーは `get_my_organization_ids()` / `get_my_role()` に統一**: 廃止された `user_org_ids()` や、単一組織前提の `get_my_organization_id()` (singular) は新規ポリシーで使わない。
- **ポリシー命名規則**: `<table>_<action>_<scope>` 形式で統一 (`tasks_select_org`, `bc_deals_all_admin` 等)。日本語名・「Users can X...」英文・`authenticated_*` プレフィックスは新規追加禁止。
- **`qual=true` のポリシー禁止**: 全公開ポリシーは作らない。必ず `organization_id IN (...)` 等のスコープを設定する。
- **ステータス系の text カラムは必ず CHECK 制約**: `status text NOT NULL DEFAULT '...'` だけにせず、`CHECK (status IN ('open', 'won', 'lost'))` のように列挙する。
- **CHECK 制約の DROP & 再追加では既存値を必ず保持**: `CHECK (role IN ('admin', 'employee'))` を `CHECK (role IN ('admin', 'manager'))` のように既存値を消すと、本番データの再書き込みが破綻する。差分追加 (`ADD CHECK ...` の前に既存値リストを取得) を徹底する。
- **ユーザー参照カラムは必ず `profiles(id)` への FK を付ける**: `user_id`, `created_by`, `assigned_to` 等の text カラムは FK 制約必須。CASCADE 方針はドメイン毎に判断:
  - 本人所有 (todos, notifications, attendance) → `ON DELETE CASCADE`
  - 作成者・履歴 (announcements, wiki, bc_*) → `ON DELETE SET NULL` (NOT NULL なら nullable 化)
  - 監査・法定保存 (audit_logs, payslips, workflow_requests) → `ON DELETE NO ACTION`
- **テーブル新規作成時は `updated_at timestamptz NOT NULL DEFAULT now()` + `set_<table>_updated_at` トリガーを必ず付ける**: append-only ログ系テーブル以外は全て対象。トリガー関数は `public.update_updated_at_column()` を使用。
- **DROP POLICY / DROP FUNCTION 系の DDL は冪等にする**: `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` または `IF NOT EXISTS` パターンで囲む。マイグレーションが部分適用された場合の再実行に備える。

## Code Style

- **Prettier** is enforced via CI. 作業完了前に対象アプリのディレクトリで `npm run format` を実行する（hr1-console, hr1-admin, hr1-employee-web, hr1-lp のいずれか）。
- **UI text and comments** are in Japanese where appropriate.
- Use `@supabase/ssr` (`createBrowserClient` / `createServerClient`) for Supabase clients — not `@supabase/supabase-js` directly.

## Flutter UI Guidelines

### 共通コンポーネント
- **ボタン**: 画面下部の主要アクション・フォーム送信には `CommonButton` を使用する。セカンダリアクション（再試行等）には `CommonButton.outline` を使用する。`FilledButton` / `ElevatedButton` を直接使わない。
- **テキストスタイル**: `AppTextStyles`（Noto Sans JP）のトークンを使用する。`TextStyle()` を直接使わない。`copyWith(fontSize:)` でサイズを上書きしない。
- **カラー**: セカンダリテキストには `AppColors.textSecondary(context)` を使用する。薄いアイコン色には `AppColors.textTertiary(context)` を使用する。`theme.colorScheme` や `theme.brightness` を直接使わない。
- **import パス**: `package:` 形式（`package:hr1_employee_app/...`）で統一する。相対パス（`../../../../...`）を使わない。
- **ローディング**: 全画面ローディングには `LoadingIndicator()` を使用する。インラインには `LoadingIndicator(size: 20)` を使用する。
- **エラー表示**: `ErrorState` を使用する。`Center(child: Text('エラー'))` を直接書かない。
- **SnackBar**: `CommonSnackBar.show()` / `CommonSnackBar.error()` を使用する。`ScaffoldMessenger.showSnackBar` を直接使わない。
- **企業アイコン**: `OrgIcon` を使用する。`CircleAvatar` で企業アイコンを作らない。

### AsyncValue.when の構造パターン

`AsyncValue.when` を使う画面は以下の構造に従う:

```dart
// Screen（HookConsumerWidget または ConsumerWidget）
//   - Scaffold + AppBar を定義
//   - body で state.when を呼ぶ
//   - data: データ表示ウィジェット（_Body 等）
//   - loading: LoadingIndicator()
//   - error: ErrorState(onRetry: ...)
//   - bottomNavigationBar 等の常時表示要素は when の外に配置する

class MyScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(myProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('タイトル')),
      body: dataAsync.when(
        data: (items) => _Body(items: items),
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(onRetry: () => ref.invalidate(myProvider)),
      ),
    );
  }
}
```

### クリーンアーキテクチャ
- **Screen**: UI の構築とユーザー操作のハンドリングのみ。ローカル UI ステート（TextEditingController、選択状態等）以外のビジネスロジックを含めない。
- **Controller**: ビジネスロジック（リポジトリ呼び出し、状態更新、データ変換）を `AutoDisposeNotifier` で管理する。Screen から `ref.read(controller.notifier).method()` で呼び出す。
- **Repository**: Supabase へのデータアクセスを集約する。Screen や Controller から `Supabase.instance.client` を直接呼ばない。
- **Provider**: `presentation/providers/` に配置する。画面ファイル内に Provider を定義しない。

## CI Pipeline (GitHub Actions)

PR to `main` で以下の5ジョブが並列実行される。npm workspaces でルートから `npm ci` → `--workspace` で各アプリを実行。

### Console (hr1-console)
1. `format:check` — Prettier
2. `lint` — ESLint
3. `test` — Vitest
4. `build` — Next.js build

### Admin (hr1-admin)
1. `build` — Next.js build

### Employee Web (hr1-employee-web)
1. `build` — Next.js build

### Employee App (hr1-employee-app)
1. `flutter pub get`
2. `dart format --set-exit-if-changed .`
3. `flutter analyze`
4. `flutter test`

### Applicant App (hr1-applicant-app)
1. `flutter pub get`
2. `dart format --set-exit-if-changed .`
3. `flutter analyze`
4. `flutter test`

## Commit Message Format

```
[prefix] <TICKET-ID> 要約

- 変更内容1
- 変更内容2
```

- **1行目**: `[プレフィックス] チケット番号 要約` — 日本語で簡潔に
- **2行目**: 空行
- **3行目以降**: 変更内容の箇条書き（`- ` で始まる）
- **チケット番号（最重要）**: **必ず現在のブランチ名から動的に取得すること**。コミット生成時は事前に `git rev-parse --abbrev-ref HEAD` を実行し、ブランチ名から `HR-\d+` パターンを抽出して使用する。
  - 例: ブランチが `feature/HR-20` なら `HR-20`、`feature/HR-42` なら `HR-42`
  - ❌ このドキュメントの例示やテンプレート内の番号（`HR-36` 等）をそのまま使わない
  - ❌ 過去のコミット履歴や記憶からチケット番号を推測しない
  - ❌ ブランチ名に `HR-\d+` パターンが含まれない場合は、ユーザーにチケット番号を確認する（勝手に番号を決めない）

### プレフィックス一覧

| プレフィックス | 用途 |
|--------------|------|
| `[add]` | 新機能追加（新しい画面、API、テーブル等） |
| `[modify]` | 既存機能の変更・修正（バグ修正を含む） |
| `[delete]` | 不要コード・機能の削除 |
| `[fix]` | バグ修正 |
| `[update]` | 既存機能の改善・拡張 |
| `[refactor]` | リファクタリング（動作を変えないコード整理） |
| `[remove]` | 不要コード・機能の削除 |
| `[style]` | フォーマット、lint修正（動作変更なし） |
| `[docs]` | ドキュメント（README、コメント、CLAUDE.md等） |
| `[test]` | テスト追加・修正 |
| `[chore]` | 依存更新、CI設定、ビルド設定等の雑務 |
| `[perf]` | パフォーマンス改善（クエリ最適化、インデックス追加等） |
| `[security]` | セキュリティ修正（RLS、認証強化等） |

例（`<TICKET-ID>` は必ず現在のブランチ名から取得した実際の番号に置き換えること）:
```
[add] <TICKET-ID> 共通関数をhr1_sharedに移行

- AppColors, AppSpacing等の定数をhr1_sharedに集約
- 両アプリの共通ウィジェット16個を移行
- PushNotificationServiceをappTypeパラメータ化
```

## Task Completion Checklist

### hr1-console / hr1-admin / hr1-employee-web
1. `npm run format` — Apply Prettier formatting (also checked by stop hook)
2. `npm run lint` — Check for ESLint errors
3. `npm run build` — Verify production build succeeds
4. `npm run test` — Verify tests pass

### hr1-lp
1. `npm run format` — Apply Prettier formatting
2. `npm run lint` — Lint check (next lint)
3. `npm run build` — Verify production build succeeds
- ※ hr1-lp にはテストがないため test は不要

### Flutter apps (hr1-applicant-app / hr1-employee-app)
1. `dart format --set-exit-if-changed .` — Format check
2. `flutter analyze` — Static analysis (warning/info も失敗扱い)
3. `flutter test` — Verify tests pass
