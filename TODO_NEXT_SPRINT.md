# 次スプリント タスク一覧

**作成日**: 2026-03-23
**ソース**: 戦略レビュー + コードレビューで検出された残存課題

---

## 🔴 優先度: 高（次スプリントで対応）

### T-1: lightTextSecondary → textSecondary(theme.brightness) 全体置換

**規模**: M（60+箇所）
**対象**: hr1-applicant-app / hr1-employee-app

CLAUDE.mdガイドライン違反。`AppColors.lightTextSecondary` 等のハードコードされたライトテーマ定数を `AppColors.textSecondary(theme.brightness)` に置換する。

**対象ファイル（applicant-app）**:
- `notifications_screen.dart` (5箇所)
- `todos_screen.dart` (12箇所)
- `todo_detail_screen.dart` (5箇所)
- `messages_screen.dart` (4箇所)
- `survey_answer_screen.dart` (8箇所)
- `survey_list_screen.dart` (6箇所)
- `application_detail_screen.dart` (20+箇所)
- `applications_screen.dart` (8箇所)
- `common_date_picker.dart` (1箇所)

**対象ファイル（employee-app）**:
- `fluent_chip.dart`
- `loading.dart`

**除外**: `app_theme.dart` は定義サイトのため対象外

---

### T-2: employee-app ConsumerStatefulWidget → HookConsumerWidget 変換

**規模**: L（15クラス）
**対象**: hr1-employee-app

CLAUDE.mdガイドラインおよびプロジェクト方針（project_flutter_anti_patterns.md）に基づき、`ConsumerStatefulWidget` を `HookConsumerWidget` に変換する。

**変換手順**:
1. `initState` → `useEffect`
2. `dispose` → `useEffect` のクリーンアップ関数
3. `TextEditingController` → `useTextEditingController()`
4. `ScrollController` → `useScrollController()`
5. `TabController` → `useTabController()`
6. `setState` → `useState`
7. `GlobalKey<FormState>()` → `useMemoized(GlobalKey<FormState>.new)`
8. `widget.xxx` → 直接参照
9. `mounted` → `context.mounted`

---

### T-3: Center(child: Text('エラー')) → ErrorState 全体置換

**規模**: S（9箇所）
**対象**: hr1-applicant-app / hr1-employee-app

CLAUDE.mdガイドライン: 「ErrorState を使用する。Center(child: Text('エラー')) を直接書かない。」

**対象ファイル（applicant-app）**:
- `section_renderers.dart:144`
- `job_detail_screen.dart:83`
- `faq_screen.dart:61`
- `interview_schedule_screen.dart:118`

**対象ファイル（employee-app）**:
- `employee_detail_screen.dart:332, 387`
- `certifications_edit_screen.dart:124`
- `skills_edit_screen.dart:74`
- `correction_request_screen.dart:202`

---

### T-4: SECURITY DEFINER関数にSET search_path追加

**規模**: S
**対象**: Supabaseマイグレーション

`SECURITY DEFINER` 関数に `SET search_path = public` が未設定の関数を修正する。

**対象関数**:
- `calculate_leave_carry_over` (`20260324000000_phase2_data_integrity_fixes.sql`)
- `auto_grant_leave_with_carry_over` (同上)

---

## 🟡 優先度: 中（中期対応）

### T-5: 監査ログのパーティショニング

**規模**: M
**対象**: Supabaseマイグレーション

5M行超を見据えた月次パーティショニング。`PARTITION BY RANGE (created_at)` への移行。

---

### T-6: 認証イベントログ

**規模**: M
**対象**: Supabase Edge Functions

login/logout/failed attemptsを `audit_logs` に記録。Supabase Auth Webhooksまたは Edge Function から `source: 'system'` で記録。

---

### T-7: i18n英語翻訳の入力

**規模**: S
**対象**: hr1-console

`src/lib/translations/en.ts` に英語翻訳を入力する。

---

### T-8: database.ts自動生成

**規模**: S
**対象**: hr1-console

`supabase gen types typescript` で `database.ts` を自動生成する仕組みに移行。

---

### T-9: service_request.request_type CHECK制約

**規模**: S
**対象**: Supabaseマイグレーション

テキスト型のままだとバリデーションなし。CHECK制約またはENUM型に変更。

---

### T-10: pg_cron本番設定の自動化

**規模**: S
**対象**: Supabaseマイグレーション / ドキュメント

マイグレーションにコメントとして記載のみ。設定漏れ防止のため自動化またはチェックリスト化。
