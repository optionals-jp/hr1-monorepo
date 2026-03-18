hr1-applicant-app（Flutter応募者アプリ）のコードレビューを実施してください。

## 手順

1. `git diff HEAD -- hr1-applicant-app/` で hr1-applicant-app 配下の変更を確認する
2. 変更されたファイルを全て読み込む
3. 以下の観点でレビューする

## レビュー観点

### 必須チェック
- **バグ・ロジックエラー**: null安全性、型不一致、条件分岐の漏れ、非同期処理のエラーハンドリング
- **セキュリティ**: 認証/認可の漏れ、機密情報のハードコード、個人情報（氏名・連絡先等）の取り扱い、Supabase RLSとの整合性
- **データ整合性**: Supabaseクエリの正確性、`.single()` vs `.maybeSingle()` の適切な使い分け

### コード品質
- **命名**: 変数・関数・クラス名が処理内容を適切に表しているか
- **重複**: 同じロジックがコピペされていないか
- **未使用コード**: importやvariableが使われずに残っていないか
- **エラーハンドリング**: 適切にエラーが処理されているか（PostgrestException等）

### クリーンアーキテクチャ
- **Controller層**: ビジネスロジック（リポジトリ呼び出し、状態更新、データ変換）がController（AsyncNotifier/Notifier）に集約されているか。Screen側に直接リポジトリ呼び出しやSupabase直接アクセスが残っていないか
- **責務分離**: Screen はUIの構築とユーザー操作のハンドリングのみ。ローカルUIステート（TextEditingController、フォーム状態等）以外のビジネスロジックがScreen側にないか
- **Provider配置**: Provider が画面ファイルではなく presentation/providers/ に配置されているか

### デザイントークン・共通コンポーネント
- **テキストスタイル**: `TextStyle()` を直接使わず `AppTextStyles` トークンを使用しているか。`copyWith(fontSize:)` でサイズを上書きしていないか
- **カラー**: ハードコードされた色（`Colors.grey` 等）ではなく `AppColors` トークンを使用しているか
- **ボタン**: 画面下部のアクションに `CommonButton` を使用しているか。`FilledButton` / `ElevatedButton` を直接使っていないか
- **ローディング**: `LoadingIndicator` を使用しているか。`CircularProgressIndicator` を直接使っていないか
- **エラー表示**: `ErrorState` を使用しているか
- **企業アイコン**: `OrgIcon` を使用しているか。`CircleAvatar` や手書きの `Container` で企業アイコンを作っていないか
- **SnackBar**: `CommonSnackBar` を使用しているか。`ScaffoldMessenger.showSnackBar` を直接使っていないか

### Flutter / Dart 固有
- **State管理**: Riverpod の Provider が適切に使われているか
- **ライフサイクル**: `mounted` チェック、`dispose` でのリソース解放
- **Widget構成**: 適切に分割されているか、ビルドメソッドが肥大化していないか
- **ナビゲーション**: GoRouter のルーティングが正しいか

### プロジェクト固有
- **UIテキスト**: 日本語が適切か（応募者向けの丁寧な表現になっているか）
- **Supabaseクライアント**: `Supabase.instance.client` 経由で使用しているか
- **エンティティ**: `fromJson` / `toJson` の整合性
- **応募フロー**: 応募ステータスの遷移が正しいか

### ビルドチェック
- レビュー完了後、`cd hr1-applicant-app && flutter analyze` を実行し、警告・エラーがないか確認する

## 出力フォーマット

レビュー結果を以下の形式で報告してください：

### 🔴 要修正（マージ前に修正が必要）
### 🟡 推奨（修正を推奨するが必須ではない）
### 🟢 良い点（特に良い実装）

各項目には **ファイル名:行番号** と **理由** を明記してください。

問題がない場合は「レビュー完了：問題なし ✅」と報告してください。
