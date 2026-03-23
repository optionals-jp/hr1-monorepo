-- ========================================================================
-- 初期テーブル定義（Supabase Studio で作成されたテーブルをマイグレーション管理下に移行）
-- IF NOT EXISTS を使用して既存環境との互換性を保持
-- ========================================================================

-- ========================================================================
-- 共通関数
-- ========================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 組織
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  industry text,
  location text,
  mission text,
  logo_url text,
  employee_count text,
  founded_year integer,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- プロフィール（auth.users と 1:1）
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  name_kana text,
  role text NOT NULL DEFAULT 'applicant' CHECK (role IN ('admin', 'employee', 'applicant')),
  avatar_url text,
  department text,
  position text,
  hiring_type text CHECK (hiring_type IN ('new_grad', 'mid_career')),
  graduation_year integer,
  birth_date date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  hire_date date,
  phone text,
  registered_address text,
  current_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- ユーザー・組織 中間テーブル
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.user_organizations (
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, organization_id)
);

ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 部署
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 社員・部署 中間テーブル
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.employee_departments (
  user_id text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, department_id)
);

ALTER TABLE public.employee_departments ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 求人
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  department text,
  location text,
  employment_type text,
  salary_range text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('open', 'closed', 'draft', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 求人ステップ
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.job_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  step_type text NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  related_id uuid
);

CREATE INDEX IF NOT EXISTS idx_job_steps_job ON public.job_steps(job_id, step_order);

ALTER TABLE public.job_steps ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 求人変更履歴
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.job_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  changed_by text DEFAULT auth.uid()::text,
  change_type text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_change_logs_job ON public.job_change_logs(job_id);

ALTER TABLE public.job_change_logs ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 応募
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id text NOT NULL,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offered', 'rejected', 'withdrawn')),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_org ON public.applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 応募ステップ
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.application_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  step_type text NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  related_id uuid,
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_application_steps_app ON public.application_steps(application_id, step_order);

ALTER TABLE public.application_steps ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 面接
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduling' CHECK (status IN ('scheduling', 'confirmed', 'completed', 'cancelled')),
  confirmed_slot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interviews_org ON public.interviews(organization_id);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 面接スロット
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.interview_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_selected boolean NOT NULL DEFAULT false,
  max_applicants integer NOT NULL DEFAULT 1,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_interview_slots_interview ON public.interview_slots(interview_id);

ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 面接変更履歴
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.interview_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  changed_by text DEFAULT auth.uid()::text,
  change_type text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_change_logs_interview ON public.interview_change_logs(interview_id);

ALTER TABLE public.interview_change_logs ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- メッセージスレッド
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  participant_id text NOT NULL,
  participant_type text NOT NULL CHECK (participant_type IN ('applicant', 'employee')),
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_org ON public.message_threads(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_participant ON public.message_threads(participant_id);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_message_threads_updated_at
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- メッセージ
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- プロジェクト
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- プロジェクトチーム
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_teams_project ON public.project_teams(project_id);

ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- プロジェクトチームメンバー
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_team_members_team ON public.project_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user ON public.project_team_members(user_id);

ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- タスク
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scope text NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'organization', 'project', 'team')),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.project_teams(id) ON DELETE SET NULL,
  due_date date,
  assign_to_all boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  source text NOT NULL DEFAULT 'console' CHECK (source IN ('employee', 'console')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- タスクアサイン
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 評価テンプレート
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target text NOT NULL DEFAULT 'employee' CHECK (target IN ('applicant', 'employee', 'both')),
  evaluation_type text NOT NULL DEFAULT 'single' CHECK (evaluation_type IN ('single', 'multi_rater')),
  anonymity_mode text NOT NULL DEFAULT 'none' CHECK (anonymity_mode IN ('none', 'peer_only', 'full')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_templates_org ON public.evaluation_templates(organization_id);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 評価基準
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  score_type text NOT NULL CHECK (score_type IN ('five_star', 'ten_point', 'text', 'select')),
  options text[],
  sort_order integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_template ON public.evaluation_criteria(template_id, sort_order);

ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 評価アンカー（スコアレベル定義）
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score_value integer NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_evaluation_anchors_criterion ON public.evaluation_anchors(criterion_id, sort_order);

ALTER TABLE public.evaluation_anchors ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 評価サイクル
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  template_id uuid NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'calibrating', 'finalized')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_cycles_org ON public.evaluation_cycles(organization_id);

ALTER TABLE public.evaluation_cycles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_evaluation_cycles_updated_at
  BEFORE UPDATE ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- 評価アサイン
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  target_user_id text NOT NULL,
  evaluator_id text NOT NULL,
  rater_type text NOT NULL CHECK (rater_type IN ('supervisor', 'peer', 'subordinate', 'self', 'external')),
  evaluation_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'skipped')),
  due_date date,
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_cycle ON public.evaluation_assignments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_target ON public.evaluation_assignments(target_user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_evaluator ON public.evaluation_assignments(evaluator_id);

ALTER TABLE public.evaluation_assignments ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 評価
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT,
  target_user_id text NOT NULL,
  evaluator_id text NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  rater_type text CHECK (rater_type IN ('supervisor', 'peer', 'subordinate', 'self', 'external')),
  assignment_id uuid REFERENCES public.evaluation_assignments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  overall_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_evaluations_org ON public.evaluations(organization_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_target ON public.evaluations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON public.evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_cycle ON public.evaluations(cycle_id);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 評価スコア
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score numeric,
  value text,
  comment text
);

CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation ON public.evaluation_scores(evaluation_id);

ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 勤怠レコード
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'present' CHECK (status IN (
    'present', 'absent', 'late', 'early_leave', 'paid_leave',
    'half_day_am', 'half_day_pm', 'holiday', 'sick_leave', 'special_leave'
  )),
  note text,
  overtime_minutes integer NOT NULL DEFAULT 0,
  late_night_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON public.attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_org ON public.attendance_records(organization_id, date);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- 打刻
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_id uuid REFERENCES public.attendance_records(id) ON DELETE SET NULL,
  punch_type text NOT NULL CHECK (punch_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  punched_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX IF NOT EXISTS idx_attendance_punches_user ON public.attendance_punches(user_id, punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_org ON public.attendance_punches(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_record ON public.attendance_punches(record_id);

ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 勤怠設定
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_start_time time NOT NULL DEFAULT '09:00',
  work_end_time time NOT NULL DEFAULT '18:00',
  break_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_attendance_settings_updated_at
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- 承認者設定
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id text,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  approver_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_approvers_org ON public.attendance_approvers(organization_id);

ALTER TABLE public.attendance_approvers ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 打刻修正申請
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  original_clock_in timestamptz,
  original_clock_out timestamptz,
  requested_clock_in timestamptz,
  requested_clock_out timestamptz,
  punch_corrections jsonb,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_user ON public.attendance_corrections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_org ON public.attendance_corrections(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_record ON public.attendance_corrections(record_id);

ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_attendance_corrections_updated_at
  BEFORE UPDATE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- ページタブ（企業ホーム CMS）
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.page_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_tabs_org ON public.page_tabs(organization_id, sort_order);

ALTER TABLE public.page_tabs ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- ページセクション（企業ホーム CMS）
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id uuid NOT NULL REFERENCES public.page_tabs(id) ON DELETE CASCADE,
  type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_sections_tab ON public.page_sections(tab_id, sort_order);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
