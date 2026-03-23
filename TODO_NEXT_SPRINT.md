# 次スプリント タスク一覧

**作成日**: 2026-03-23
**最終更新日**: 2026-03-23（2回目の全体レビュー反映）

---

## 🔴 優先度: 高（次スプリント）

### T-1: employee-app 相対import → package: import

**規模**: L（61ファイル / 211箇所）
**対象**: hr1-employee-app

CLAUDE.mdガイドライン: 「`package:` 形式で統一する。相対パスを使わない。」
全61ファイルの `import '../../../../...'` を `import 'package:hr1_employee_app/...'` に置換する。

---

### T-2: lightTextSecondary → textSecondary(theme.brightness)

**規模**: M
**対象**: hr1-applicant-app（60+箇所）/ hr1-employee-app（6箇所）

`AppColors.lightTextSecondary` 等のハードコードを `AppColors.textSecondary(theme.brightness)` に置換。

**applicant-app対象ファイル**:
- `notifications_screen.dart` (5箇所)
- `todos_screen.dart` (12箇所)
- `todo_detail_screen.dart` (5箇所)
- `messages_screen.dart` (4箇所)
- `survey_answer_screen.dart` (8箇所)
- `survey_list_screen.dart` (6箇所)
- `application_detail_screen.dart` (20+箇所)
- `applications_screen.dart` (8箇所)
- `common_date_picker.dart` (1箇所)

**employee-app対象ファイル**:
- `fluent_chip.dart` (5箇所)
- `loading.dart` (1箇所)

---

### T-3: onSurface.withValues() → AppColors

**規模**: S（7ファイル / 11箇所）
**対象**: hr1-employee-app

`theme.colorScheme.onSurface.withValues(alpha: ...)` を `AppColors.textSecondary(theme.brightness)` / `AppColors.textTertiary(theme.brightness)` に置換。

**対象ファイル**:
- `tasks_screen.dart` (1箇所)
- `notice_list_item.dart` (1箇所)
- `portal_screen.dart` (1箇所)
- `thread_chat_screen.dart` (2箇所)
- `messages_screen.dart` (1箇所)
- `calendar_screen.dart` (2箇所)
- `event_card.dart` (2箇所)

---

### T-4: employee-app ConsumerStatefulWidget → HookConsumerWidget

**規模**: L（13ファイル）
**対象**: hr1-employee-app

**対象ファイル**:
- `login_screen.dart`
- `splash_screen.dart`
- `profile_edit_screen.dart`
- `search_screen.dart`
- `survey_answer_screen.dart`
- `survey_list_screen.dart`
- `tasks_screen.dart`
- `shift_request_screen.dart`
- `thread_chat_screen.dart`
- `calendar_screen.dart`
- `correction_request_screen.dart`
- `workflow_create_screen.dart`
- `service_request_create_screen.dart`

---

### T-5: Center(child: Text('エラー')) → ErrorState

**規模**: S（9箇所）
**対象**: hr1-applicant-app / hr1-employee-app

**applicant-app**:
- `section_renderers.dart:144`
- `job_detail_screen.dart:83`
- `faq_screen.dart:61`
- `interview_schedule_screen.dart:118`

**employee-app**:
- `employee_detail_screen.dart:332, 387`
- `certifications_edit_screen.dart:124`
- `skills_edit_screen.dart:74`
- `correction_request_screen.dart:202`

---

### T-6: SECURITY DEFINER search_path追加

**規模**: S
**対象**: Supabaseマイグレーション

- `calculate_leave_carry_over()`
- `auto_grant_leave_with_carry_over()`

---

### T-7: FilledButton → CommonButton

**規模**: S（2箇所）
**対象**: hr1-applicant-app

- `common_date_picker.dart:221` — FilledButton
- `app_theme.dart` — ElevatedButtonTheme（定義サイトのため対象外の可能性あり）

---

## 🟡 優先度: 中（中期対応）

| # | タスク | 規模 | 対象 |
|---|--------|------|------|
| T-8 | 監査ログ パーティショニング（月次、5M行超を見据え） | M | backend |
| T-9 | 認証イベントログ（login/logout/failed attempts） | M | backend |
| T-10 | i18n英語翻訳入力 | S | console |
| T-11 | database.ts自動生成（`supabase gen types`） | S | console |
| T-12 | service_request.request_type CHECK制約 | S | backend |
| T-13 | pg_cron本番設定自動化 | S | backend |
| T-14 | Dio未使用依存の削除 | S | applicant/employee |
| T-15 | audit_logs INSERT policy org_idチェック強化 | S | backend |
| T-16 | applicant_todos.user_id FK制約追加 | S | backend |
