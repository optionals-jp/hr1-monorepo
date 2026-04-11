-- ========================================================================
-- FK カラムに欠落していたインデックスを 37 本追加
--
-- PostgreSQL は FK 定義時に自動でインデックスを作成しないため、
-- FK カラムに index が無いと以下の性能問題が発生する:
--   * 親テーブル DELETE/UPDATE 時に子テーブル全スキャンが発生
--   * JOIN 時のパフォーマンス低下
--   * ON DELETE CASCADE / SET NULL が遅延
--
-- 監査結果から 37 FK カラムが index 未整備。
-- 大半は WHERE NULL 除外の partial index で容量節約。
-- ========================================================================

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.announcements(created_by) WHERE created_by IS NOT NULL;

-- attendance_corrections
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_reviewed_by
  ON public.attendance_corrections(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- audit_logs_archive
CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_user
  ON public.audit_logs_archive(user_id) WHERE user_id IS NOT NULL;

-- contract_changes
CREATE INDEX IF NOT EXISTS idx_contract_changes_changed_by
  ON public.contract_changes(changed_by) WHERE changed_by IS NOT NULL;

-- crm_activities
CREATE INDEX IF NOT EXISTS idx_crm_activities_company
  ON public.crm_activities(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_by
  ON public.crm_activities(created_by) WHERE created_by IS NOT NULL;

-- crm_cards
CREATE INDEX IF NOT EXISTS idx_crm_cards_scanned_by
  ON public.crm_cards(scanned_by) WHERE scanned_by IS NOT NULL;

-- crm_companies
CREATE INDEX IF NOT EXISTS idx_crm_companies_created_by
  ON public.crm_companies(created_by) WHERE created_by IS NOT NULL;

-- crm_contacts
CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_by
  ON public.crm_contacts(created_by) WHERE created_by IS NOT NULL;

-- crm_deals
CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned_to
  ON public.crm_deals(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_created_by
  ON public.crm_deals(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage
  ON public.crm_deals(stage_id) WHERE stage_id IS NOT NULL;

-- crm_email_templates
CREATE INDEX IF NOT EXISTS idx_crm_email_templates_created_by
  ON public.crm_email_templates(created_by) WHERE created_by IS NOT NULL;

-- crm_field_values
CREATE INDEX IF NOT EXISTS idx_crm_field_values_org
  ON public.crm_field_values(organization_id);

-- crm_leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_by
  ON public.crm_leads(created_by) WHERE created_by IS NOT NULL;

-- crm_quotes
CREATE INDEX IF NOT EXISTS idx_crm_quotes_contact
  ON public.crm_quotes(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_quotes_created_by
  ON public.crm_quotes(created_by) WHERE created_by IS NOT NULL;

-- crm_todos
CREATE INDEX IF NOT EXISTS idx_crm_todos_company
  ON public.crm_todos(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_todos_contact
  ON public.crm_todos(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_todos_created_by
  ON public.crm_todos(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_todos_deal
  ON public.crm_todos(deal_id) WHERE deal_id IS NOT NULL;

-- custom_forms
CREATE INDEX IF NOT EXISTS idx_custom_forms_application
  ON public.custom_forms(application_id) WHERE application_id IS NOT NULL;

-- departments (自己参照)
CREATE INDEX IF NOT EXISTS idx_departments_parent
  ON public.departments(parent_id) WHERE parent_id IS NOT NULL;

-- evaluation_assignments
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_evaluation
  ON public.evaluation_assignments(evaluation_id) WHERE evaluation_id IS NOT NULL;

-- evaluation_cycles
CREATE INDEX IF NOT EXISTS idx_evaluation_cycles_created_by
  ON public.evaluation_cycles(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_cycles_template
  ON public.evaluation_cycles(template_id);

-- evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_application
  ON public.evaluations(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluations_assignment
  ON public.evaluations(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluations_template
  ON public.evaluations(template_id);

-- interview_slots
CREATE INDEX IF NOT EXISTS idx_interview_slots_application
  ON public.interview_slots(application_id) WHERE application_id IS NOT NULL;

-- interviews
CREATE INDEX IF NOT EXISTS idx_interviews_application
  ON public.interviews(application_id) WHERE application_id IS NOT NULL;

-- job_sections
CREATE INDEX IF NOT EXISTS idx_job_sections_job
  ON public.job_sections(job_id);

-- pulse_surveys
CREATE INDEX IF NOT EXISTS idx_pulse_surveys_created_by
  ON public.pulse_surveys(created_by) WHERE created_by IS NOT NULL;

-- push_notification_logs
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_notification
  ON public.push_notification_logs(notification_id) WHERE notification_id IS NOT NULL;

-- wiki_pages
CREATE INDEX IF NOT EXISTS idx_wiki_pages_created_by
  ON public.wiki_pages(created_by) WHERE created_by IS NOT NULL;

-- workflow_requests
CREATE INDEX IF NOT EXISTS idx_workflow_requests_reviewed_by
  ON public.workflow_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;
