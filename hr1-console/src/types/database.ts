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
