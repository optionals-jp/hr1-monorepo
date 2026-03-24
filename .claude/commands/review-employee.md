hr1-employee-app（Flutter社員アプリ）のコードレビューを実施してください。

## 手順

1. `git diff HEAD -- hr1-employee-app/` と `git diff origin/main...HEAD -- hr1-employee-app/` で変更を確認する
2. 変更がある場合は変更されたファイルを全て読み込む。変更がない場合は `hr1-employee-app/lib/` 配下の全 Screen・Controller・Repository を対象にアプリ全体レビューを実施する
3. 以下の観点でレビューする

## レビュー観点

### 必須チェック
- **バグ・ロジックエラー**: null安全性、型不一致、条件分岐の漏れ、非同期処理のエラーハンドリング
- **セキュリティ**: 認証/認可の漏れ、機密情報のハードコード、個人情報（社員名簿・給与明細・連絡先等）の取り扱い、Supabase RLSとの整合性
- **データ整合性**: Supabaseクエリの正確性、`.single()` vs `.maybeSingle()` の適切な使い分け

### コード品質
- **命名**: 変数・関数・クラス名が処理内容を適切に表しているか
- **重複**: 同じロジックがコピペされていないか
- **未使用コード**: importやvariableが使われずに残っていないか
- **エラーハンドリング**: 適切にエラーが処理されているか（PostgrestException等）

### クリーンアーキテクチャ
- **Controller層**: ビジネスロジック（リポジトリ呼び出し、状態更新、データ変換）がController（AsyncNotifier/Notifier）に集約されているか。Screen側に直接リポジトリ呼び出しやSupabase直接アクセスが残っていないか
- **Repository層**: Supabase へのデータアクセスが Repository に集約されているか。Screen や Controller から `Supabase.instance.client` を直接呼んでいないか
- **責務分離**: Screen はUIの構築とユーザー操作のハンドリングのみ。ローカルUIステート（TextEditingController、フォーム状態等）以外のビジネスロジックがScreen側にないか
- **Provider配置**: Provider が画面ファイルではなく presentation/providers/ に配置されているか
- **AsyncValue.when パターン**: Screen が Scaffold → body → `state.when(data: _Body(), loading: LoadingIndicator(), error: ErrorState())` の構造パターンに従っているか。bottomNavigationBar 等の常時表示要素は when の外に配置されているか

### hr1_shared との共通化
- **重複ロジック**: hr1-applicant-app と同じロジック（バリデーション、日付フォーマット、サニタイズ等）がアプリ内に書かれていないか → `hr1_shared/lib/src/utils/` に入れるべき
- **重複ウィジェット**: 新しいウィジェットが `hr1_shared` の既存ウィジェット（CommonButton, CommonCard, CommonDialog, CommonSheet, EmptyState, ErrorState, LoadingIndicator, MenuRow, SearchBox, UserAvatar, OrgIcon, SkeletonBone 等）と重複していないか
- **共通化候補**: アプリ固有の `lib/core/utils/` や `lib/shared/` に両アプリ共通化できるコードが放置されていないか

### デザイントークン・共通コンポーネント
- **テキストスタイル**: `TextStyle()` を直接使わず `AppTextStyles` トークンを使用しているか。`copyWith(fontSize:)` でサイズを上書きしていないか
- **カラー**: セカンダリテキストに `AppColors.textSecondary(context)` を使用しているか。薄いアイコン色に `AppColors.textTertiary(context)` を使用しているか。`theme.colorScheme` や `theme.brightness` を直接使っていないか
- **ボタン**: 画面下部のアクションに `CommonButton` を使用しているか。`FilledButton` / `ElevatedButton` を直接使っていないか
- **ローディング**: `LoadingIndicator` を使用しているか。`CircularProgressIndicator` を直接使っていないか
- **エラー表示**: `ErrorState` を使用しているか。`Center(child: Text('エラー'))` を直接書いていないか
- **スケルトン**: ローディング時に `SkeletonContainer` + `SkeletonBone` を使用しているか
- **SnackBar**: `CommonSnackBar.show()` / `CommonSnackBar.error()` を使用しているか。`ScaffoldMessenger.showSnackBar` を直接使っていないか

### Flutter / Dart 固有
- **State管理**: Riverpod の Provider が適切に使われているか。不要な `ref.watch` による再ビルドがないか
- **ライフサイクル**: `mounted` チェック、`dispose` でのリソース解放
- **Widget構成**: 適切に分割されているか、ビルドメソッドが肥大化していないか。ListView 内で `const` が適用可能な箇所に適用されているか
- **ナビゲーション**: GoRouter のルーティングが正しいか
- **import パス**: `package:hr1_employee_app/...` 形式で統一されているか。相対パス（`../../../../...`）を使っていないか

### プロジェクト固有
- **UIテキスト**: 日本語が適切か
- **Supabaseクライアント**: `Supabase.instance.client` 経由で使用しているか
- **エンティティ**: `fromJson` / `toJson` の整合性
- **開発モード**: `kDevMode` 分岐が適切か

### ビルドチェック
- レビュー完了後、`cd hr1-employee-app && flutter analyze` を実行し、警告・エラーがないか確認する

## 出力フォーマット

レビュー結果を以下の形式で報告してください：

### 🔴 要修正（マージ前に修正が必要）
### 🟡 推奨（修正を推奨するが必須ではない）
### 🟢 良い点（特に良い実装）

各項目には **ファイル名:行番号** と **理由** を明記してください。

問題がない場合は「レビュー完了：問題なし ✅」と報告してください。
