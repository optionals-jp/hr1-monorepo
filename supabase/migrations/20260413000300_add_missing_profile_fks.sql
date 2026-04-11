-- ========================================================================
-- profiles(id) への FK 制約を30カラムに追加
--
-- 方針:
-- * CASCADE : 本人所有コンテンツ (退職/削除で消える妥当なもの)
-- * SET NULL : 作成者や履歴 (ユーザー削除後も記録は残す)
-- * NOT NULL のカラムは SET NULL 採用時に nullable 化する
-- * audit_logs の 18件孤立を NULL 化してから FK 追加
-- ========================================================================

-- ================================================================
-- 1. audit_logs: 孤立 18件を NULL 化 + nullable 化 + SET NULL
-- ================================================================
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.audit_logs_archive ALTER COLUMN user_id DROP NOT NULL;

UPDATE public.audit_logs SET user_id = NULL
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs_archive
  ADD CONSTRAINT audit_logs_archive_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ================================================================
-- 2. NOT NULL → SET NULL 用に nullable 化が必要なカラム
-- ================================================================
ALTER TABLE public.announcements ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.bc_cards ALTER COLUMN scanned_by DROP NOT NULL;
ALTER TABLE public.wiki_pages ALTER COLUMN created_by DROP NOT NULL;

-- ================================================================
-- 3. CASCADE 系 FK (本人所有: 退職/削除で消える)
-- ================================================================
ALTER TABLE public.applicant_todos
  ADD CONSTRAINT applicant_todos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.channel_members
  ADD CONSTRAINT channel_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.employee_certifications
  ADD CONSTRAINT employee_certifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.employee_skills
  ADD CONSTRAINT employee_skills_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.employee_tasks
  ADD CONSTRAINT employee_tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.leave_balances
  ADD CONSTRAINT leave_balances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pulse_survey_responses
  ADD CONSTRAINT pulse_survey_responses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.push_tokens
  ADD CONSTRAINT push_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.shift_requests
  ADD CONSTRAINT shift_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.shift_schedules
  ADD CONSTRAINT shift_schedules_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.form_responses
  ADD CONSTRAINT form_responses_applicant_id_fkey
  FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ================================================================
-- 4. SET NULL 系 FK (作成者・履歴)
-- ================================================================
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.wiki_pages
  ADD CONSTRAINT wiki_pages_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bc_cards
  ADD CONSTRAINT bc_cards_scanned_by_fkey
  FOREIGN KEY (scanned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bc_companies
  ADD CONSTRAINT bc_companies_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bc_contacts
  ADD CONSTRAINT bc_contacts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bc_deals
  ADD CONSTRAINT bc_deals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bc_todos
  ADD CONSTRAINT bc_todos_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- bc_todos.assigned_to は NOT NULL なので nullable 化してから
ALTER TABLE public.bc_todos ALTER COLUMN assigned_to DROP NOT NULL;

ALTER TABLE public.bc_todos
  ADD CONSTRAINT bc_todos_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.compliance_alerts
  ADD CONSTRAINT compliance_alerts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pulse_surveys
  ADD CONSTRAINT pulse_surveys_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.workflow_requests
  ADD CONSTRAINT workflow_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ================================================================
-- 5. 履歴保持系 (NO ACTION + NOT NULL 維持)
--    ※ 削除時は ERROR になる → 運用上「退職者データ移管後に profile 削除」
-- ================================================================
ALTER TABLE public.payslips
  ADD CONSTRAINT payslips_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

ALTER TABLE public.workflow_requests
  ADD CONSTRAINT workflow_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

ALTER TABLE public.push_notification_logs
  ADD CONSTRAINT push_notification_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;
