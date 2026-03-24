# 次スプリント タスク一覧

**最終更新日**: 2026-03-23

---

## 🔴 優先度: 高（次スプリント）

### T-1: employee-app ConsumerStatefulWidget → HookConsumerWidget 変換

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

### T-2: Center(child: Text('エラー')) → ErrorState 全体置換

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

### T-3: FilledButton → CommonButton

**規模**: S（2箇所）
**対象**: hr1-applicant-app

- `todo_detail_screen.dart:104, 111`

---

## 🟡 優先度: 中（中期対応）

| # | タスク | 規模 | 対象 |
|---|--------|------|------|
| T-4 | 監査ログ パーティショニング | M | backend |
| T-5 | 認証イベントログ（login/logout） | M | backend |
| T-6 | i18n英語翻訳入力 | S | console |
| T-7 | database.ts自動生成 | S | console |
| T-8 | service_request.request_type CHECK制約 | S | backend |
| T-9 | pg_cron本番設定自動化 | S | backend |
| T-10 | Dio未使用依存の削除 | S | applicant/employee |
| T-11 | shift_schedules.status CHECK制約 | S | backend |
