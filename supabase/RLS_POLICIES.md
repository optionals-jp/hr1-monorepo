# RLS Policies Reference

All tables have `ROW LEVEL SECURITY` enabled. This document catalogs the final active policies after all migrations through `20260325100000`.

Legend:
- **Org member** = `get_my_organization_ids()` helper function
- **Admin** = `get_my_role() = 'admin'` helper function
- **Own** = `user_id = auth.uid()::text` (or equivalent)
- **FOR ALL** = covers SELECT, INSERT, UPDATE, DELETE

## Helper Functions

`profiles` と `user_organizations` の相互参照による RLS 無限再帰を防ぐため、以下の `SECURITY DEFINER` ヘルパー関数を使用する。

| Function | Returns | Description |
|----------|---------|-------------|
| `get_my_role()` | `text` | 現在のユーザーの `profiles.role` を返す（RLS迂回） |
| `get_my_organization_ids()` | `SETOF text` | 現在のユーザーの所属組織ID一覧を返す（RLS迂回） |

---

## organizations

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `org_select_member` | SELECT | Org member via `get_my_organization_ids()` | 20260324300000 |
| `org_all_admin` | ALL | Admin via `get_my_role()` + `get_my_organization_ids()` | 20260324300000 |

## profiles

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `profiles_select_own` | SELECT | Own (`id = auth.uid()`) | 20260324300000 |
| `profiles_select_org_member` | SELECT | Same org member via `get_my_organization_ids()` | 20260324600000 |
| `profiles_update_own` | UPDATE | Own | 20260324300000 |
| `profiles_all_admin` | ALL | Admin via `get_my_role()` | 20260324600000 |

## user_organizations

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `user_org_select_own` | SELECT | Own | 20260324300000 |
| `user_org_all_admin` | ALL | Admin via `get_my_role()` | 20260324600000 |

## departments

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `departments_select_org` | SELECT | Org member | 20260324700000 |
| `departments_all_admin` | ALL | Admin | 20260324700000 |

## employee_departments

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `emp_dept_select_org` | SELECT | Org member (via department) | 20260324500000 |
| `emp_dept_all_admin` | ALL | Admin (via department) | 20260324500000 |

## jobs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `jobs_select_org` | SELECT | Org member | 20260324700000 |
| `jobs_all_admin` | ALL | Admin | 20260324700000 |

## job_steps

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `job_steps_select_org` | SELECT | Org member (via job) | 20260324500000 |
| `job_steps_all_admin` | ALL | Admin (via job) | 20260324500000 |

## applications

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `applications_select_own` | SELECT | Own (`applicant_id`) | 20260324300000 |
| `applications_insert_own` | INSERT | Own (`applicant_id`) | 20260324300000 |
| `applications_all_admin` | ALL | Admin | 20260324700000 |

## application_steps

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `app_steps_select_own` | SELECT | Own application | 20260324500000 |
| `app_steps_all_admin` | ALL | Admin (via application) | 20260324500000 |

## interviews

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `interviews_select_org` | SELECT | Org member | 20260324500000 |
| `interviews_all_admin` | ALL | Admin | 20260324500000 |

## interview_slots

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `interview_slots_select_org` | SELECT | Org member (via interview) | 20260324500000 |
| `interview_slots_all_admin` | ALL | Admin (via interview) | 20260324500000 |

## message_threads

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `threads_select` | SELECT | Org member or participant | 20260324700000 |
| `threads_all_admin` | ALL | Admin | 20260324700000 |

## messages

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `messages_select_thread_member` | SELECT | Thread participant or org member | 20260324700000 |
| `messages_insert_authenticated` | INSERT | Own (`sender_id`) | 20260324300000 |
| `messages_update_own` | UPDATE | Own sender | 20260324700000 |

## channel_members

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `channel_members_select_own` | SELECT | Own or same channel member | 20260325000000 |
| `channel_members_all_admin` | ALL | Admin | 20260325000000 |

## tasks

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `tasks_select_org` | SELECT | Org member | 20260324700000 |
| `tasks_all_admin` | ALL | Admin | 20260324700000 |

## task_assignees

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `task_assignees_select_own` | SELECT | Own | 20260324500000 |
| `task_assignees_select_org` | SELECT | Org member (via task) | 20260324500000 |
| `task_assignees_update_own` | UPDATE | Own | 20260324500000 |
| `task_assignees_all_admin` | ALL | Admin (via task) | 20260324500000 |

## projects

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `projects_select_org` | SELECT | Org member | 20260324500000 |
| `projects_all_admin` | ALL | Admin | 20260324500000 |

## project_teams / project_team_members

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `project_teams_select_org` | SELECT | Org member (via project) | 20260324500000 |
| `project_teams_all_admin` | ALL | Admin (via project) | 20260324500000 |
| `project_team_members_select_org` | SELECT | Org member (via project) | 20260324500000 |
| `project_team_members_all_admin` | ALL | Admin (via project) | 20260324500000 |

## evaluation_templates / criteria / anchors

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_templates_select_org` | SELECT | Org member | 20260324500000 |
| `eval_templates_all_admin` | ALL | Admin | 20260324500000 |
| `eval_criteria_select_org` | SELECT | Org member (via template) | 20260324500000 |
| `eval_criteria_all_admin` | ALL | Admin (via template) | 20260324500000 |
| `eval_anchors_select_org` | SELECT | Org member (via criterion/template) | 20260324500000 |
| `eval_anchors_all_admin` | ALL | Admin (via criterion/template) | 20260324500000 |

## evaluation_cycles / assignments / evaluations / scores

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_cycles_select_org` | SELECT | Org member | 20260324500000 |
| `eval_cycles_all_admin` | ALL | Admin | 20260324500000 |
| `eval_assignments_select_related` | SELECT | Target, evaluator, or admin | 20260324500000 |
| `eval_assignments_all_admin` | ALL | Admin (via cycle) | 20260324500000 |
| `evaluations_select_related` | SELECT | Evaluator, target, or admin | 20260324500000 |
| `evaluations_insert_evaluator` | INSERT | Evaluator or admin | 20260324500000 |
| `evaluations_update_evaluator` | UPDATE | Evaluator or admin | 20260324500000 |
| `evaluation_scores_select` | SELECT | Evaluator, target, or admin | 20260323900000 |
| `evaluation_scores_insert` | INSERT | Evaluator only | 20260323900000 |
| `evaluation_scores_update` | UPDATE | Evaluator only | 20260323900000 |

## attendance (records / punches / settings / approvers / corrections)

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `attendance_records_select_own` | SELECT | Own | 20260324500000 |
| `attendance_records_insert_own` | INSERT | Own | 20260324500000 |
| `attendance_records_update_own` | UPDATE | Own | 20260324500000 |
| `attendance_records_all_admin` | ALL | Admin | 20260324500000 |
| `attendance_punches_select_own` | SELECT | Own | 20260324500000 |
| `attendance_punches_insert_own` | INSERT | Own | 20260324500000 |
| `attendance_punches_all_admin` | ALL | Admin | 20260324500000 |
| `attendance_settings_select_org` | SELECT | Org member | 20260324500000 |
| `attendance_settings_all_admin` | ALL | Admin | 20260324500000 |
| `attendance_approvers_select_org` | SELECT | Org member | 20260324500000 |
| `attendance_approvers_all_admin` | ALL | Admin | 20260324500000 |
| `attendance_corrections_select_own` | SELECT | Own | 20260324500000 |
| `attendance_corrections_insert_own` | INSERT | Own | 20260324500000 |
| `attendance_corrections_update_own` | UPDATE | Own + pending only | 20260324500000 |
| `attendance_corrections_all_admin` | ALL | Admin | 20260324500000 |

## employee_skills / employee_certifications / masters

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `同一組織内のスキルを閲覧` | SELECT | Org member | 20260316000000 |
| `自分のスキルを管理` | ALL | Own | 20260316000000 |
| `同一組織内の資格を閲覧` | SELECT | Org member | 20260316000000 |
| `自分の資格を管理` | ALL | Own | 20260316000000 |

## faqs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `faqs_select_org` | SELECT | Org member | 20260316600000 |
| `faqs_insert/update/delete_admin` | INSERT/UPDATE/DELETE | Admin | 20260316600000 |

## pulse_surveys / questions / responses / answers

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `pulse_surveys_select` | SELECT | Org member | 20260317100000 |
| `pulse_surveys_insert/update/delete_admin` | CUD | Admin | 20260317100000 |
| `pulse_survey_responses_select` | SELECT | Own or admin | 20260317100000 |
| `pulse_survey_responses_insert` | INSERT | Own + active survey | 20260317100000 |

## notifications / push_tokens

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `notifications_select_own` | SELECT | Own | 20260318000000 |
| `notifications_insert_admin` | INSERT | Admin | 20260318000000 |
| `push_tokens_select/insert/update/delete_own` | ALL | Own | 20260318100000 |

## workflow_requests / leave_balances / payslips

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `自分の申請を閲覧/作成/取消` | SELECT/INSERT/UPDATE | Own | 20260323000000 |
| `管理者は組織内の申請を閲覧/更新` | SELECT/UPDATE | Admin | 20260323000000 |
| `自分の残日数を閲覧` | SELECT | Own | 20260323100000 |
| `管理者は組織内の残日数を管理` | ALL | Admin | 20260323100000 |
| `自分の給与明細を閲覧` | SELECT | Own | 20260323200000 |
| `管理者は組織内の給与明細を管理` | ALL | Admin | 20260323200000 |

## employee_tasks / employee_task_steps

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `employee_tasks_select/insert/update/delete_own` | ALL | Own | 20260324000000 |
| `employee_task_steps_select/insert/update/delete` | ALL | Own (via parent task) | 20260324000000 |

## audit_logs / audit_logs_archive / audit_logs_errors

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `管理者が監査ログを閲覧` | SELECT | Admin (same org) | 20260324700000 |
| `audit_logs_insert` | INSERT | Admin (same org) | 20260324700000 |
| `audit_logs_deny_update` | UPDATE | DENIED (`false`) | 20260324400000 |
| `audit_logs_deny_delete` | DELETE | DENIED (`false`) | 20260324400000 |
| `archive_select_admin` | SELECT | Admin (same org) | 20260324400000 |
| `archive_deny_update/delete/insert` | ALL | DENIED (`false`) | 20260324400000 |
| `audit_logs_errors` | — | RLS enabled, no policies (deny all; SECURITY DEFINER only) | 20260324400000 |
| `audit_logs_errors_select_admin` | SELECT | Admin | 20260324400000 |

## workflow_rules

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `workflow_rules_select_org` | SELECT | Org member | 20260324800000 |
| `workflow_rules_all_admin` | ALL | Admin | 20260324800000 |

## announcements

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `announcements_select_org` | SELECT | Org member + published only | 20260324900000 |
| `announcements_all_admin` | ALL | Admin | 20260324900000 |

## channel_members

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `channel_members_select_own` | SELECT | Own or same channel member | 20260325000000 |
| `channel_members_all_admin` | ALL | Admin | 20260325000000 |

## wiki_pages

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `wiki_pages_select_org` | SELECT | Org member + published only | 20260325100000 |
| `wiki_pages_all_admin` | ALL | Admin | 20260325100000 |

---

## Storage Buckets

### avatars (public)

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `アバターをパブリックに閲覧` | SELECT | Public | 20260323500000 |
| `認証ユーザーが自分のアバターをアップロード` | INSERT | Authenticated, own folder | 20260323500000 |
| `認証ユーザーが自分のアバターを更新` | UPDATE | Authenticated, own folder | 20260323500000 |
| `認証ユーザーが自分のアバターを削除` | DELETE | Authenticated, own folder | 20260323500000 |

---

## Notes

- All admin policies use `get_my_role()` and `get_my_organization_ids()` helper functions (migrated in 20260324700000).
- The `DO $$ ... EXCEPTION WHEN duplicate_object` pattern ensures idempotency.
- `form_change_logs`, `job_change_logs`, `interview_change_logs` were dropped in `20260324400000` after data was migrated to `audit_logs`.
- `profiles` と `user_organizations` のRLSポリシーは `SECURITY DEFINER` ヘルパー関数を使用して無限再帰を防止（20260324600000）。
- 削除済みポリシー: `user_org_select_org_member`, `authenticated_read_user_organizations`（再帰の原因）。
