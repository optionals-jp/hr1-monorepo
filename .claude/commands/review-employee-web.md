hr1-employee-web（Next.js 社員向けWebアプリ）のコードレビューを実施してください。

## 概要

hr1-employee-web は社員向けの Web アプリです。自身の勤怠・休暇・給与明細の確認、プロフィール管理、社内お知らせ・メッセージ・タスク・評価・申請フロー等の日常業務機能を提供します。
Next.js App Router + TypeScript + Supabase + `@hr1/shared-ui` + SWR + Tailwind CSS v4 で構築されています。ポート 3003。

hr1-console（テナント管理者向けコンソール）とは別アプリですが、同一の Supabase プロジェクトを参照し、共通UIは `@hr1/shared-ui` から import します。

## 手順

1. `git diff HEAD -- hr1-employee-web/` と `git diff origin/main...HEAD -- hr1-employee-web/` で変更を確認する
2. 変更がある場合は変更されたファイルを全て読み込む。変更がない場合は `hr1-employee-web/src/` 配下の全ページ・コンポーネント・hooks を対象にアプリ全体レビューを実施する
3. 以下の観点でレビューする

## レビュー観点

### 必須チェック
- **バグ・ロジックエラー**: off-by-one、null参照、型不一致、条件分岐の漏れ
- **セキュリティ**: 社員個人データの漏洩防止（給与明細、勤怠、評価、連絡先等）。他社員のデータを取得できないか（user_id / employee_id フィルタ、RLS の二重防御）。XSS、SQLインジェクション、機密情報のハードコード
- **テナント分離 + 個人データ分離**: 社員は自社（org_id）のデータかつ自分に関連するデータのみアクセス可能か。クエリに org_id + 本人フィルタが両方含まれているか
- **データ整合性**: DB操作の整合性、外部キー制約、楽観的更新の整合性
- **HTML ネスト制約**: `<button>` 内に `<button>` をネストしていないか。インタラクティブ要素のネストで hydration エラーを起こしていないか

### 暫定的な対応・ワークアラウンドの禁止（🔴 要修正）

**基本方針**: 暫定対応・ワークアラウンド・応急処置は一切禁止。根本原因を特定して正しく修正する。大規模改修になっても構わないので、**安全で可読性の高いコード**を常に優先する。

- **インライン再定義**: import が削除された enum / 定数を関数内やファイル冒頭にインライン再定義していないか → 正しい `lib/constants/` に配置する
- **TODO/FIXME/HACK コメント**: `// TODO: 後で` / `// 暫定` / `// 一時的` 等の先送りコメントを新規追加していないか
- **`any` / `as unknown as` / `@ts-ignore` / `@ts-expect-error` の濫用**: 型エラーを握り潰していないか
- **try/catch の握り潰し**: `catch (e) {}` / `catch (e) { return null }` でエラーを黙殺していないか
- **ハードコード分岐での応急処置**: 特定IDや特定ロールで `if` 分岐し本来のバグを回避していないか
- **コピペで類似関数を新規作成**: 既存関数を修正するのを避け、類似関数を増やしていないか → 既存を拡張する
- **`XxxV2` / `XxxNew` / `XxxLegacy` 命名での新旧並存**: 置き換え完了まで責任を持って完遂する
- **フィーチャーフラグの放置**: 切替完了後の旧フロー削除をサボっていないか
- **エラー戻り値スワップ**: エラー時に `null` を返して呼び出し元に「なかったことにする」ていないか → `{data, error}` 形式か throw

**指摘フォーマット**: `[ファイル:行] の記述は暫定対応。根本原因: [原因]。正しい修正: [大規模でも構わないので正しい方針]`

### クリーンアーキテクチャ

hr1-console と同一のレイヤー構成に従う。レイヤー間の依存方向と責務分離を厳密にチェックしてください。

#### レイヤー構成と責務

| レイヤー | 配置場所 | 責務 |
|---------|---------|------|
| **Presentation** | `app/`, `features/*/components/`, `components/` | UI描画、ユーザー操作のハンドリング、トースト等のUI通知 |
| **Application (Hooks)** | `features/*/hooks/`, `lib/hooks/` | ユースケースのオーケストレーション、状態管理、Repository呼び出しの結合 |
| **Domain** | `features/*/types.ts`, `features/*/rules.ts`, `lib/constants/`, `types/` | 型定義、ビジネスルール（純粋関数）、定数・enum |
| **Infrastructure** | `lib/repositories/`, `lib/supabase/` | 外部サービス（Supabase）との通信、データアクセス、RPC呼び出し |

#### Hooks の分類

| 種類 | 責務 | 例 |
|------|------|-----|
| **Query Hook** | データ取得 + キャッシュ管理（SWR） | `useMyPayslips()`, `useMyAttendance()` |
| **Mutation Hook** | 単一操作の実行。成功/失敗を返す | `useRequestLeave()`, `useClockIn()` |
| **Page Hook** | 画面単位で Query + Mutation + UI状態を統合 | `useMyAttendancePage()` |

- Mutation Hook は結果（成功/エラー）を返し、UI通知（トースト等）はコンポーネント側で行う
- hooks 内で `useToast` / `showToast` を呼ばない

#### Repository 層の設計

- Repository はテーブル（またはドメイン集約）単位で作成する
- Supabase クライアントは引数で受け取る（テスト容易性のため）
- RPC 呼び出し・Edge Function 呼び出し・Realtime subscription も Repository に配置する（hooks から `functions.invoke()` / `channel()` を直接呼ばない）
- コンポーネントや hooks から `supabase.from()` を直接呼ばない。必ず Repository 経由

#### SWR キャッシュキー設計

- **テナント分離**: キャッシュキーに `org_id` を含める（別企業にログインし直した際に前企業のキャッシュが残らないように）
- **個人データ**: キャッシュキーに `user_id` または `employee_id` を含める（別ユーザー切替時の混入防止）
- SWR のキーは配列形式 `['resource', orgId, userId, ...]` で明示的に

#### 依存方向チェック（内向きのみ許可）
- ❌ **Components が Supabase を直接呼んでいないか**: 必ず hooks 経由
- ❌ **Hooks が UI ライブラリに依存していないか**: JSX を返さない、DOM 操作をしない、トースト関数を呼ばない
- ❌ **Hooks が Supabase を直接呼んでいないか**: Repository 経由で DB アクセス
- ❌ **lib/ が UI ライブラリに依存していないか**: `lucide-react` 等を import しない
- ✅ **Components → Hooks → Repository → Supabase** の依存方向

#### page.tsx のサイズガイドライン

- page.tsx は **hooks の呼び出し + JSX レンダリングのみ**
- 目安: **300行以下**
- useState / ビジネスロジックを page.tsx 内に書かない
- page.tsx 内にサブコンポーネントを定義しない

#### Feature モジュールの構成チェック
```
features/{feature-name}/
├── components/
├── hooks/
├── types.ts
└── rules.ts
```

### 共有UIパッケージ（@hr1/shared-ui）

- **共通コンポーネント優先**: Button, Card, Dialog, Input, Badge 等、`@hr1/shared-ui` に存在するコンポーネントをローカルで再実装していないか
- **import**: `import { Button } from '@hr1/shared-ui'` で統一。ローカル `components/ui/` の重複コンポーネントを新設していないか
- **スタイル流用**: hr1-console と同じレイアウト課題（一覧画面、フィルター、検索、タブ）は shared-ui 側の共通レイアウトを優先する。インラインで `sticky top-14` / `border-b-2 -mb-px` 等のパターンをコピペしていないか
- **shared-ui への昇格候補**: hr1-console と同じコンポーネントがローカルで再実装されている場合は `@hr1/shared-ui` への移行を提案する

### 社員向けアプリ固有

- **本人データのスコープ**: `/my-*` 配下（my-attendance, my-leave, payslips, profile 等）は本人データのみを返すべき。同僚のデータを取得できる実装になっていないか
- **権限ベースの表示分岐**: マネージャー / 一般社員 の役割差で表示項目が分かれる箇所は、サーバー側（RLS or Server Component）で制御されているか。クライアント側の非表示だけに頼っていないか
- **UIテキスト**: 社員向けの丁寧で親しみやすい日本語になっているか（運営者向け・管理者向けの語彙になっていないか）
- **モバイル最適化**: 社員はモバイルから利用する頻度が高いため、主要画面がモバイル表示で崩れないか。タップターゲットのサイズが十分か

### コード品質
- **命名**: 変数・関数名が処理内容を適切に表しているか
- **命名規約（ログ）**: 「〇〇履歴」ではなく「〇〇ログ」に統一する
- **重複**: 同じロジックがコピペされていないか（hr1-console と同一のロジックが重複している場合は `@hr1/shared-ui` or 共有パッケージへの昇格を検討）
- **未使用コード**: import や variable が使われずに残っていないか
- **エラーハンドリング**: 適切にエラーが処理されているか（過剰なハンドリングは不要）

### アクセシビリティ
- タブには `role="tablist"` / `role="tab"` / `aria-selected` が設定されているか
- フォーム入力には `aria-label` または `<label>` が関連付けられているか
- インタラクティブ要素にキーボード操作が可能か

### Next.js / React 固有
- **"use client" / Server Components**: インタラクティブ画面は `"use client"`、静的な表示のみの画面は Server Component を優先
- **React Hooks**: useEffect の依存配列が正しいか、不要な useEffect がないか
- **再レンダリング**: オブジェクトリテラル直接渡し、useCallback/useMemo の欠如等で不要な再レンダリングが発生していないか
- **SWR**: `mutate` によるキャッシュ更新が適切に行われているか。Optimistic update の失敗時ロールバック

### Supabase クライアント
- **SSR クライアント**: `@supabase/ssr` 経由（`createBrowserClient` / `createServerClient`）で使用しているか
- **テナント分離 + 本人分離**: クエリに org_id + user_id/employee_id の両方が含まれているか
- **型定義**: `src/types/database.ts` との整合性
- **RLS 依存**: クライアント側でのフィルタだけでなく、RLS ポリシーでも二重に保護されているか

### UI / スタイリング
- **共通コンポーネント**: `@hr1/shared-ui` のコンポーネントを優先使用
- **Tailwind CSS**: 任意値クラス（`w-[347px]`）ではなく標準クラスを優先
- **レスポンシブ**: モバイル表示での崩れがないか（社員利用の主流デバイス）

### ビルド・Lint チェック
- レビュー完了後、`cd hr1-employee-web && npm run format && npm run lint && npm run test && npm run build` を実行し、エラーがないか確認する

## 出力フォーマット

レビュー結果を以下の形式で報告してください：

### 🔴 要修正（マージ前に修正が必要）
### 🟡 推奨（修正を推奨するが必須ではない）
### 🟢 良い点（特に良い実装）

各項目には **ファイル名:行番号** と **理由** を明記してください。

問題がない場合は「レビュー完了：問題なし ✅」と報告してください。
