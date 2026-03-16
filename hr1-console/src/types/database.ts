export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  mission: string | null;
  logo_url: string | null;
  employee_count: string | null;
  founded_year: number | null;
  website_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  name_kana: string | null;
  role: "admin" | "employee" | "applicant";
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  hiring_type: "new_grad" | "mid_career" | null;
  graduation_year: number | null;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  hire_date: string | null;
  phone: string | null;
  registered_address: string | null;
  current_address: string | null;
  created_at: string;
}

export interface UserOrganization {
  user_id: string;
  organization_id: string;
  profiles?: Profile;
  organizations?: Organization;
}

export interface Job {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
  status: "open" | "closed" | "draft" | "archived";
  created_at: string;
}

export interface JobStep {
  id: string;
  job_id: string;
  step_type: string;
  step_order: number;
  label: string;
  related_id: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  organization_id: string;
  status: "active" | "offered" | "rejected" | "withdrawn";
  applied_at: string;
  jobs?: Job;
  profiles?: Profile;
  application_steps?: ApplicationStep[];
}

export interface ApplicationStep {
  id: string;
  application_id: string;
  step_type: string;
  step_order: number;
  label: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  related_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CustomForm {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  target: "applicant" | "employee" | "both";
  created_at: string;
}

export interface FormField {
  id: string;
  form_id: string;
  type: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  is_required: boolean;
  options: string[] | null;
  sort_order: number;
}

export interface FormResponse {
  id: string;
  form_id: string;
  application_id: string;
  field_id: string;
  value: string;
  created_at: string;
}

export interface FormChangeLog {
  id: string;
  form_id: string;
  changed_by: string | null;
  change_type: string;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface JobChangeLog {
  id: string;
  job_id: string;
  changed_by: string | null;
  change_type: string;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Interview {
  id: string;
  organization_id: string;
  title: string;
  location: string | null;
  notes: string | null;
  status: "scheduling" | "confirmed" | "completed" | "cancelled";
  confirmed_slot_id: string | null;
  created_at: string;
}

export interface InterviewChangeLog {
  id: string;
  interview_id: string;
  changed_by: string | null;
  change_type: string;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface InterviewSlot {
  id: string;
  interview_id: string;
  start_at: string;
  end_at: string;
  is_selected: boolean;
  max_applicants: number;
  application_id: string | null;
  applications?: {
    id: string;
    profiles?: { display_name: string | null; email: string };
  };
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface EmployeeDepartment {
  user_id: string;
  department_id: string;
  departments?: Department;
}

export interface EvaluationTemplate {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  target: "applicant" | "employee" | "both";
  evaluation_type: "single" | "multi_rater";
  anonymity_mode: "none" | "peer_only" | "full";
  created_at: string;
}

export interface EvaluationCriterion {
  id: string;
  template_id: string;
  label: string;
  description: string | null;
  score_type: "five_star" | "ten_point" | "text" | "select";
  options: string[] | null;
  sort_order: number;
  weight: number;
}

export interface EvaluationAnchor {
  id: string;
  criterion_id: string;
  score_value: number;
  description: string;
  sort_order: number;
}

export interface EvaluationCycle {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  template_id: string;
  status: "draft" | "active" | "closed" | "calibrating" | "finalized";
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  evaluation_templates?: EvaluationTemplate;
}

export type RaterType = "supervisor" | "peer" | "subordinate" | "self" | "external";

export interface EvaluationAssignment {
  id: string;
  cycle_id: string;
  target_user_id: string;
  evaluator_id: string;
  rater_type: RaterType;
  evaluation_id: string | null;
  status: "pending" | "in_progress" | "submitted" | "skipped";
  due_date: string | null;
  reminded_at: string | null;
  created_at: string;
  target_user?: Profile;
  evaluator?: Profile;
}

export interface Evaluation {
  id: string;
  organization_id: string;
  template_id: string;
  target_user_id: string;
  evaluator_id: string;
  application_id: string | null;
  cycle_id: string | null;
  rater_type: RaterType | null;
  assignment_id: string | null;
  status: "draft" | "submitted";
  overall_comment: string | null;
  created_at: string;
  submitted_at: string | null;
  evaluation_templates?: EvaluationTemplate;
  evaluator?: Profile;
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number | null;
  value: string | null;
  comment: string | null;
}

export interface MessageThread {
  id: string;
  organization_id: string;
  participant_id: string;
  participant_type: "applicant" | "employee";
  title: string | null;
  created_at: string;
  updated_at: string;
  participant?: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    department?: string | null;
    position?: string | null;
  };
  /** カンマ区切りの応募求人名（応募者スレッドのみ） */
  job_titles?: string | null;
  /** 応募件数（応募者スレッドのみ） */
  application_count?: number;
  latest_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
  sender?: Profile;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface ProjectTeam {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ProjectTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "leader" | "member";
  joined_at: string;
  left_at: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  organization_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  status:
    | "present"
    | "absent"
    | "late"
    | "early_leave"
    | "paid_leave"
    | "half_day_am"
    | "half_day_pm"
    | "holiday"
    | "sick_leave"
    | "special_leave";
  note: string | null;
  overtime_minutes: number;
  late_night_minutes: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface AttendancePunch {
  id: string;
  user_id: string;
  organization_id: string;
  record_id: string | null;
  punch_type: "clock_in" | "clock_out" | "break_start" | "break_end";
  punched_at: string;
  note: string | null;
}

export interface AttendanceSettingsRow {
  id: string;
  organization_id: string;
  work_start_time: string;
  work_end_time: string;
  break_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceApprover {
  id: string;
  organization_id: string;
  user_id: string | null;
  department_id: string | null;
  project_id: string | null;
  approver_id: string;
  created_at: string;
  profiles?: Profile;
  approver?: Profile;
  departments?: Department;
  projects?: Project;
}

export interface AttendanceCorrection {
  id: string;
  organization_id: string;
  record_id: string;
  user_id: string;
  original_clock_in: string | null;
  original_clock_out: string | null;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  reviewer?: Profile;
  attendance_records?: AttendanceRecord;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  scope: "personal" | "organization" | "project" | "team";
  project_id: string | null;
  team_id: string | null;
  due_date: string | null;
  assign_to_all: boolean;
  created_by: string;
  source: "employee" | "console";
  created_at: string;
  updated_at: string;
  projects?: Project;
  project_teams?: ProjectTeam;
  creator?: Profile;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  status: "pending" | "in_progress" | "completed";
  completed_at: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface EmployeeSkill {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface EmployeeCertification {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  acquired_date: string | null;
  score: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface CertificationMaster {
  id: string;
  organization_id: string | null;
  name: string;
  category: string | null;
  has_score: boolean;
  created_at: string;
}

export interface SkillMaster {
  id: string;
  organization_id: string | null;
  name: string;
  category: string | null;
  created_at: string;
}
