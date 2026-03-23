# RLS Policies Reference

All tables have `ROW LEVEL SECURITY` enabled. This document catalogs the final active policies after all migrations through `20260324500000`.

Legend:
- **Org member** = `user_organizations` join on `auth.uid()::text`
- **Admin** = org member with `profiles.role = 'admin'`
- **Own** = `user_id = auth.uid()::text` (or equivalent)
- **FOR ALL** = covers SELECT, INSERT, UPDATE, DELETE

---

## organizations

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `org_select_member` | SELECT | Org member | 20260324300000 |
| `org_all_admin` | ALL | Admin | 20260324300000 |

## profiles

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `profiles_select_own` | SELECT | Own (`id = auth.uid()`) | 20260324300000 |
| `profiles_select_org_member` | SELECT | Same org member | 20260324300000 |
| `profiles_update_own` | UPDATE | Own | 20260324300000 |
| `profiles_all_admin` | ALL | Admin (global) | 20260324300000 |

## user_organizations

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `user_org_select_own` | SELECT | Own | 20260324300000 |
| `user_org_select_org_member` | SELECT | Same org member | 20260324300000 |
| `user_org_all_admin` | ALL | Admin in same org | 20260324300000 |

## departments

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `departments_select_org` | SELECT | Org member | 20260324300000 |
| `departments_all_admin` | ALL | Admin | 20260324300000 |

## employee_departments

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `emp_dept_select_org` | SELECT | Org member (via department) | 20260324500000 |
| `emp_dept_all_admin` | ALL | Admin (via department) | 20260324500000 |

## jobs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `jobs_select_org` | SELECT | Org member | 20260324300000 |
| `jobs_all_admin` | ALL | Admin | 20260324300000 |

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
| `applications_all_admin` | ALL | Admin | 20260324300000 |

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
| `threads_select` | SELECT | Participant or admin/employee in org | 20260324300000 |
| `threads_all_admin` | ALL | Admin | 20260324300000 |

## messages

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `messages_select_thread_member` | SELECT | Thread participant or admin/employee in org | 20260324300000 |
| `messages_insert_authenticated` | INSERT | Own (`sender_id`) | 20260324300000 |
| `messages_update_own` | UPDATE | Own sender or admin/employee in org | 20260324300000 |

## tasks

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `tasks_select_org` | SELECT | Org member | 20260324300000 |
| `tasks_all_admin` | ALL | Admin | 20260324300000 |

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

## project_teams

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `project_teams_select_org` | SELECT | Org member (via project) | 20260324500000 |
| `project_teams_all_admin` | ALL | Admin (via project) | 20260324500000 |

## project_team_members

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `project_team_members_select_org` | SELECT | Org member (via project) | 20260324500000 |
| `project_team_members_all_admin` | ALL | Admin (via project) | 20260324500000 |

## evaluation_templates

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_templates_select_org` | SELECT | Org member | 20260324500000 |
| `eval_templates_all_admin` | ALL | Admin | 20260324500000 |

## evaluation_criteria

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_criteria_select_org` | SELECT | Org member (via template) | 20260324500000 |
| `eval_criteria_all_admin` | ALL | Admin (via template) | 20260324500000 |

## evaluation_anchors

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_anchors_select_org` | SELECT | Org member (via criterion/template) | 20260324500000 |
| `eval_anchors_all_admin` | ALL | Admin (via criterion/template) | 20260324500000 |

## evaluation_cycles

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_cycles_select_org` | SELECT | Org member | 20260324500000 |
| `eval_cycles_all_admin` | ALL | Admin | 20260324500000 |

## evaluation_assignments

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `eval_assignments_select_related` | SELECT | Target, evaluator, or admin | 20260324500000 |
| `eval_assignments_all_admin` | ALL | Admin (via cycle) | 20260324500000 |

## evaluations

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `evaluations_select_related` | SELECT | Evaluator, target, or admin | 20260324500000 |
| `evaluations_insert_evaluator` | INSERT | Evaluator or admin | 20260324500000 |
| `evaluations_update_evaluator` | UPDATE | Evaluator or admin | 20260324500000 |

## evaluation_scores

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `evaluation_scores_select` | SELECT | Evaluator, target, or admin | 20260323900000 |
| `evaluation_scores_insert` | INSERT | Evaluator only | 20260323900000 |
| `evaluation_scores_update` | UPDATE | Evaluator only | 20260323900000 |

## attendance_records

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `attendance_records_select_own` | SELECT | Own | 20260324500000 |
| `attendance_records_insert_own` | INSERT | Own | 20260324500000 |
| `attendance_records_update_own` | UPDATE | Own | 20260324500000 |
| `attendance_records_all_admin` | ALL | Admin | 20260324500000 |

## attendance_punches

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `attendance_punches_select_own` | SELECT | Own | 20260324500000 |
| `attendance_punches_insert_own` | INSERT | Own | 20260324500000 |
| `attendance_punches_all_admin` | ALL | Admin | 20260324500000 |

## attendance_settings

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `attendance_settings_select_org` | SELECT | Org member | 20260324500000 |
| `attendance_settings_all_admin` | ALL | Admin | 20260324500000 |

## attendance_approvers

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `attendance_approvers_select_org` | SELECT | Org member | 20260324500000 |
| `attendance_approvers_all_admin` | ALL | Admin | 20260324500000 |

## attendance_corrections

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `attendance_corrections_select_own` | SELECT | Own | 20260324500000 |
| `attendance_corrections_insert_own` | INSERT | Own | 20260324500000 |
| `attendance_corrections_update_own` | UPDATE | Own + pending only | 20260324500000 |
| `attendance_corrections_all_admin` | ALL | Admin | 20260324500000 |

## employee_skills

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `同一組織内のスキルを閲覧` | SELECT | Org member | 20260316000000 |
| `自分のスキルを管理` | ALL | Own | 20260316000000 |

## employee_certifications

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `同一組織内の資格を閲覧` | SELECT | Org member | 20260316000000 |
| `自分の資格を管理` | ALL | Own | 20260316000000 |

## certification_masters

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `資格マスタを閲覧` | SELECT | System-wide or org member | 20260316100000 |
| `自組織の資格マスタを管理` | INSERT | Org member (own org only) | 20260316100000 |
| `自組織の資格マスタを更新` | UPDATE | Org member (own org only) | 20260316100000 |
| `自組織の資格マスタを削除` | DELETE | Org member (own org only) | 20260316100000 |

## skill_masters

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `スキルマスタを閲覧` | SELECT | System-wide or org member | 20260316200000 |
| `自組織のスキルマスタを追加` | INSERT | Org member (own org only) | 20260316200000 |
| `自組織のスキルマスタを更新` | UPDATE | Org member (own org only) | 20260316200000 |
| `自組織のスキルマスタを削除` | DELETE | Org member (own org only) | 20260316200000 |

## faqs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `faqs_select_org` | SELECT | Org member | 20260316600000 |
| `faqs_insert_admin` | INSERT | Admin/hr_manager | 20260316600000 |
| `faqs_update_admin` | UPDATE | Admin/hr_manager | 20260316600000 |
| `faqs_delete_admin` | DELETE | Admin/hr_manager | 20260316600000 |

## pulse_surveys

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `pulse_surveys_select` | SELECT | Org member | 20260317100000 |
| `pulse_surveys_insert_admin` | INSERT | Admin/hr_manager | 20260317100000 |
| `pulse_surveys_update_admin` | UPDATE | Admin/hr_manager | 20260317100000 |
| `pulse_surveys_delete_admin` | DELETE | Admin/hr_manager | 20260317100000 |

## pulse_survey_questions

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `pulse_survey_questions_select` | SELECT | Org member (via survey) | 20260317100000 |
| `pulse_survey_questions_insert_admin` | INSERT | Admin/hr_manager + draft only | 20260317100000 |
| `pulse_survey_questions_update_admin` | UPDATE | Admin/hr_manager + draft only | 20260317100000 |
| `pulse_survey_questions_delete_admin` | DELETE | Admin/hr_manager + draft only | 20260317100000 |

## pulse_survey_responses

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `pulse_survey_responses_select` | SELECT | Own or admin/hr_manager | 20260317100000 |
| `pulse_survey_responses_insert` | INSERT | Own + active survey | 20260317100000 |
| `pulse_survey_responses_update` | UPDATE | Own | 20260317100000 |
| `pulse_survey_responses_delete_admin` | DELETE | Admin/hr_manager | 20260317100000 |

## pulse_survey_answers

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `pulse_survey_answers_select` | SELECT | Own or admin/hr_manager | 20260317100000 |
| `pulse_survey_answers_insert` | INSERT | Own response | 20260317100000 |
| `pulse_survey_answers_update` | UPDATE | Own response | 20260317100000 |
| `pulse_survey_answers_delete_admin` | DELETE | Admin/hr_manager | 20260317100000 |

## page_tabs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `page_tabs_select` | SELECT | Org member | 20260317200000 |
| `page_tabs_insert_admin` | INSERT | Admin/hr_manager | 20260317200000 |
| `page_tabs_update_admin` | UPDATE | Admin/hr_manager | 20260317200000 |
| `page_tabs_delete_admin` | DELETE | Admin/hr_manager | 20260317200000 |

## page_sections

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `page_sections_select` | SELECT | Org member (via tab) | 20260317200000 |
| `page_sections_insert_admin` | INSERT | Admin/hr_manager (via tab) | 20260317200000 |
| `page_sections_update_admin` | UPDATE | Admin/hr_manager (via tab) | 20260317200000 |
| `page_sections_delete_admin` | DELETE | Admin/hr_manager (via tab) | 20260317200000 |

## notifications

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `notifications_select_own` | SELECT | Own | 20260318000000 |
| `notifications_insert_admin` | INSERT | Admin/hr_manager | 20260318000000 |
| `notifications_update_own` | UPDATE | Own | 20260318000000 |
| `notifications_delete` | DELETE | Own or admin/hr_manager | 20260318000000 |

## push_tokens

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `push_tokens_select_own` | SELECT | Own | 20260318100000 |
| `push_tokens_insert_own` | INSERT | Own | 20260318100000 |
| `push_tokens_update_own` | UPDATE | Own | 20260318100000 |
| `push_tokens_delete_own` | DELETE | Own | 20260318100000 |

## shift_requests

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `同一組織内のシフト希望を閲覧` | SELECT | Org member | 20260319000000 |
| `自分のシフト希望を管理` | ALL | Own | 20260319000000 |

## shift_schedules

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `同一組織内の確定シフトを閲覧` | SELECT | Org member | 20260319000000 |
| `管理者が確定シフトを管理` | ALL | Admin | 20260319000000 |

## applicant_todos

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `applicant_todos_select_own` | SELECT | Own | 20260320000000 |
| `applicant_todos_insert_own` | INSERT | Own | 20260320000000 |
| `applicant_todos_update_own` | UPDATE | Own | 20260320000000 |
| `applicant_todos_delete_manual_only` | DELETE | Own + manual source only | 20260323900000 |

## service_requests

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `自分のリクエストを閲覧` | SELECT | Own | 20260323300000 |
| `自分のリクエストを作成` | INSERT | Own | 20260323300000 |
| `管理者が全リクエストを閲覧` | SELECT | Admin (global) | 20260323900000 |
| `管理者がリクエストを更新` | UPDATE | Admin (global) | 20260323900000 |

## workflow_requests

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `自分の申請を閲覧` | SELECT | Own | 20260323000000 |
| `自分の申請を作成` | INSERT | Own | 20260323000000 |
| `自分の未承認申請を取消` | UPDATE | Own + pending, can only set cancelled | 20260323000000 |
| `管理者は組織内の申請を閲覧` | SELECT | Admin | 20260323000000 |
| `管理者は組織内の申請を更新` | UPDATE | Admin (with check) | 20260323900000 |

## leave_balances

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `自分の残日数を閲覧` | SELECT | Own | 20260323100000 |
| `管理者は組織内の残日数を管理` | ALL | Admin | 20260323100000 |

## payslips

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `自分の給与明細を閲覧` | SELECT | Own | 20260323200000 |
| `管理者は組織内の給与明細を管理` | ALL | Admin | 20260323200000 |

## custom_forms

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `同一組織メンバーがフォームを閲覧` | SELECT | Org member | 20260323700000 |
| `管理者がフォームを管理` | ALL | Admin | 20260323700000 |

## form_fields

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `フォームフィールドを閲覧` | SELECT | Org member (via form) | 20260323700000 |
| `管理者がフィールドを管理` | ALL | Admin (via form) | 20260323700000 |

## form_responses

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `自分の回答を閲覧` | SELECT | Own (`applicant_id`) | 20260323700000 |
| `自分の回答を送信` | INSERT | Own (`applicant_id`) | 20260323700000 |
| `管理者が回答を閲覧` | SELECT | Admin (via form) | 20260323700000 |

## employee_tasks

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `employee_tasks_select_own` | SELECT | Own | 20260324000000 |
| `employee_tasks_insert_own` | INSERT | Own | 20260324000000 |
| `employee_tasks_update_own` | UPDATE | Own | 20260324000000 |
| `employee_tasks_delete_own` | DELETE | Own | 20260324000000 |

## employee_task_steps

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `employee_task_steps_select` | SELECT | Own (via parent task) | 20260324000000 |
| `employee_task_steps_insert` | INSERT | Own (via parent task) | 20260324000000 |
| `employee_task_steps_update` | UPDATE | Own (via parent task) | 20260324000000 |
| `employee_task_steps_delete` | DELETE | Own (via parent task) | 20260324000000 |

## push_notification_logs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `push_notification_logs_select_admin` | SELECT | Admin (global) | 20260324000000 |

## audit_logs

| Policy | Operation | Condition | Migration |
|--------|-----------|-----------|-----------|
| `管理者が監査ログを閲覧` | SELECT | Admin (same org) | 20260324400000 |
| `audit_logs_insert_service_role` | INSERT | service_role only | 20260324500000 |
| *(no UPDATE/DELETE policy)* | UPDATE/DELETE | Denied by RLS default | - |

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

- Tables marked with `FOR ALL` admin policies: the admin policy covers all four operations (SELECT, INSERT, UPDATE, DELETE). Specific per-operation policies (e.g., `_select_own`) work alongside them via PostgreSQL's OR-based policy evaluation.
- The `DO $$ ... EXCEPTION WHEN duplicate_object` pattern in migrations `20260324300000` and `20260324500000` ensures idempotency for environments where policies may already exist.
- `form_change_logs`, `job_change_logs`, `interview_change_logs` were dropped in migration `20260324400000` after data was migrated to `audit_logs`.
