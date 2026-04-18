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
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  role: "admin" | "employee" | "applicant" | "manager" | "approver" | "hr1_admin";
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  hiring_type: "new_grad" | "mid_career" | null;
  graduation_year: number | null;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  hire_date: string | null;
  phone: string | null;
  current_postal_code: string | null;
  current_prefecture: string | null;
  current_city: string | null;
  current_street_address: string | null;
  current_building: string | null;
  registered_postal_code: string | null;
  registered_prefecture: string | null;
  registered_city: string | null;
  registered_street_address: string | null;
  registered_building: string | null;
  school_name: string | null;
  school_faculty: string | null;
  work_history: string | null;
  skills: string | null;
  self_introduction: string | null;
  invited_at: string | null;
  created_at: string;
}

export interface UserOrganization {
  user_id: string;
  organization_id: string;
  profiles?: Profile;
  organizations?: Organization;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  category: string;
  target_type: string;
  target_id: string;
  parent_type: string | null;
  parent_id: string | null;
  summary: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  sequence_number: number;
  organization_id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  source: string;
  created_at: string;
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
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
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
  deleted_at: string | null;
  updated_at: string;
}

export interface EvaluationAnchor {
  id: string;
  criterion_id: string;
  score_value: number;
  description: string;
  sort_order: number;
  updated_at: string;
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
  is_channel?: boolean;
  channel_name?: string | null;
  channel_type?: "department" | "project" | "custom" | null;
  channel_source_id?: string | null;
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
  member_count?: number;
}

export interface ChannelMember {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at: string;
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
  punch_corrections: PunchCorrection[] | null;
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

export interface PunchCorrection {
  punch_id: string;
  punch_type: string;
  original_punched_at: string;
  requested_punched_at: string;
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
  level: number;
  skill_master_id: string | null;
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
  description: string | null;
  created_at: string;
}

export interface WikiPage {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: string | null;
  parent_id: string | null;
  is_published: boolean;
  created_by: string;
  updated_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: string;
  organization_id: string;
  question: string;
  answer: string;
  category: string;
  target: "employee" | "applicant" | "both";
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PulseSurvey {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  target: "applicant" | "employee" | "both";
  status: "draft" | "active" | "closed";
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  pulse_survey_questions?: PulseSurveyQuestion[];
}

export interface PulseSurveyQuestion {
  id: string;
  survey_id: string;
  type: "rating" | "text" | "single_choice" | "multiple_choice";
  label: string;
  description: string | null;
  is_required: boolean;
  options: string[] | null;
  sort_order: number;
  created_at: string;
}

export interface PulseSurveyResponse {
  id: string;
  survey_id: string;
  organization_id: string;
  user_id: string;
  completed_at: string | null;
  created_at: string;
  profiles?: Profile;
  pulse_survey_answers?: PulseSurveyAnswer[];
}

export interface PulseSurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  value: string | null;
  created_at: string;
}

export interface ShiftRequest {
  id: string;
  user_id: string;
  organization_id: string;
  target_date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface ShiftSchedule {
  id: string;
  user_id: string;
  organization_id: string;
  target_date: string;
  start_time: string;
  end_time: string;
  position_label: string | null;
  note: string | null;
  status: "draft" | "published";
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface WorkflowRequest {
  id: string;
  organization_id: string;
  user_id: string;
  request_type: "paid_leave" | "overtime" | "business_trip" | "expense";
  status: "pending" | "approved" | "rejected" | "cancelled";
  request_data: Record<string, unknown>;
  reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  reviewer?: Profile;
}

export interface WorkflowRule {
  id: string;
  organization_id: string;
  request_type: string;
  rule_type: "auto_approve" | "notify" | "validate";
  conditions: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  organization_id: string;
  user_id: string;
  fiscal_year: number;
  granted_days: number;
  used_days: number;
  carried_over_days: number;
  expired_days: number;
  grant_date: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Announcement {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  target: "all" | "employee" | "applicant";
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAlert {
  id: string;
  organization_id: string;
  user_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface Payslip {
  id: string;
  organization_id: string;
  user_id: string;
  year: number;
  month: number;
  base_salary: number;
  allowances: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  gross_pay: number;
  net_pay: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

// ==========================================================
// CRM（名刺管理）
// ==========================================================

export interface BcCompany {
  id: string;
  organization_id: string;
  name: string;
  name_kana: string | null;
  corporate_number: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BcContact {
  id: string;
  organization_id: string;
  company_id: string | null;
  last_name: string;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  crm_companies?: BcCompany;
}

export interface BcCard {
  id: string;
  organization_id: string;
  contact_id: string | null;
  image_url: string;
  raw_text: string | null;
  scanned_by: string;
  scanned_at: string;
  created_at: string;
}

export interface BcDeal {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  title: string;
  amount: number | null;
  status: "open" | "won" | "lost" | "cancelled";
  probability: number | null;
  expected_close_date: string | null;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
  crm_companies?: BcCompany;
  crm_contacts?: BcContact;
  profiles?: Profile;
  crm_pipeline_stages?: CrmPipelineStage;
}

export type DealContactRole =
  | "decision_maker"
  | "influencer"
  | "champion"
  | "end_user"
  | "evaluator"
  | "stakeholder";

export interface BcDealContact {
  id: string;
  organization_id: string;
  deal_id: string;
  contact_id: string;
  role: DealContactRole;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  crm_contacts?: BcContact;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface BcQuote {
  id: string;
  organization_id: string;
  deal_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  quote_number: string;
  title: string;
  status: QuoteStatus;
  issue_date: string;
  expiry_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  crm_companies?: BcCompany;
  crm_contacts?: BcContact;
  crm_deals?: BcDeal;
  crm_quote_items?: BcQuoteItem[];
}

export interface BcQuoteItem {
  id: string;
  quote_id: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface BcActivity {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  activity_type: "appointment" | "memo" | "call" | "email" | "visit";
  title: string;
  description: string | null;
  activity_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null; email: string } | null;
}

export interface BcTodo {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  assigned_to: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null; email: string } | null;
}

export interface CrmDealStageHistory {
  id: string;
  organization_id: string;
  deal_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  from_stage_name: string | null;
  to_stage_name: string;
  changed_by: string | null;
  changed_at: string;
  profiles?: { display_name: string | null; email: string } | null;
}

export type BcLeadSource = "web" | "referral" | "event" | "cold_call" | "other";
export type BcLeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";

export interface BcLead {
  id: string;
  organization_id: string;
  /** リード企業名（必須） */
  name: string;
  /** 担当者名 */
  contact_name: string | null;
  /** 担当者メール */
  contact_email: string | null;
  /** 担当者電話 */
  contact_phone: string | null;
  source: BcLeadSource;
  status: BcLeadStatus;
  assigned_to: string | null;
  notes: string | null;
  converted_company_id: string | null;
  converted_contact_id: string | null;
  converted_deal_id: string | null;
  converted_at: string | null;
  /** profiles(id) 参照 — text型 */
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

// ==========================================================
// CRM パイプライン
// ==========================================================

export interface CrmPipeline {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  crm_pipeline_stages?: CrmPipelineStage[];
}

export interface CrmPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  probability_default: number;
  sort_order: number;
  created_at: string;
}

// ==========================================================
// CRM カスタムフィールド
// ==========================================================

export type CrmEntityType = "company" | "contact" | "deal";

export type CrmFieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "dropdown"
  | "multi_select"
  | "checkbox"
  | "url"
  | "email"
  | "phone";

export interface CrmFieldDefinition {
  id: string;
  organization_id: string;
  entity_type: CrmEntityType;
  field_type: CrmFieldType;
  label: string;
  description: string | null;
  placeholder: string | null;
  is_required: boolean;
  options: string[] | null;
  field_group: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CrmFieldValue {
  id: string;
  organization_id: string;
  field_id: string;
  entity_id: string;
  entity_type: CrmEntityType;
  value: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================================
// CRM 保存ビュー
// ==========================================================

export interface CrmSavedViewFilter {
  field: string;
  operator: "eq" | "neq" | "contains" | "gt" | "lt" | "gte" | "lte" | "empty" | "not_empty";
  value: string;
}

export interface CrmSavedViewConfig {
  columns?: string[];
  filters?: CrmSavedViewFilter[];
  sort?: { field: string; direction: "asc" | "desc" };
}

export interface CrmSavedView {
  id: string;
  organization_id: string;
  user_id: string;
  entity_type: CrmEntityType;
  name: string;
  is_shared: boolean;
  is_default: boolean;
  config: CrmSavedViewConfig;
  created_at: string;
  updated_at: string;
}

// ==========================================================
// CRM 自動化ルール
// ==========================================================

export type CrmAutomationTrigger =
  | "deal_stage_changed"
  | "deal_created"
  | "deal_won"
  | "deal_lost"
  | "lead_created"
  | "lead_status_changed"
  | "lead_converted"
  | "contact_created"
  | "company_created"
  | "activity_created";

export type CrmAutomationActionType =
  | "create_todo"
  | "create_activity"
  | "send_notification"
  | "update_field"
  | "send_webhook";

export interface CrmAutomationCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
  value: string | number | string[];
}

export interface CrmAutomationAction {
  type: CrmAutomationActionType;
  params: Record<string, unknown>;
}

export interface CrmAutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: CrmAutomationTrigger;
  conditions: CrmAutomationCondition[];
  actions: CrmAutomationAction[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CrmAutomationLogStatus = "success" | "partial" | "failed";

export interface CrmAutomationLog {
  id: string;
  organization_id: string;
  rule_id: string;
  trigger_type: string;
  entity_type: string;
  entity_id: string;
  actions_executed: CrmAutomationAction[];
  status: CrmAutomationLogStatus;
  error_message: string | null;
  executed_at: string;
  crm_automation_rules?: CrmAutomationRule;
}

// ==========================================================
// CRM メールテンプレート
// ==========================================================

export type CrmEmailTemplateCategory =
  | "general"
  | "follow_up"
  | "proposal"
  | "thank_you"
  | "introduction"
  | "reminder";

export interface CrmEmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  subject: string;
  body: string;
  category: CrmEmailTemplateCategory;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================================
// CRM Webhook
// ==========================================================

export type CrmWebhookEvent =
  | "deal.created"
  | "deal.updated"
  | "deal.won"
  | "deal.lost"
  | "lead.created"
  | "lead.converted"
  | "contact.created"
  | "company.created"
  | "quote.created"
  | "quote.accepted";

export interface CrmWebhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  secret: string | null;
  is_active: boolean;
  events: string[];
  headers: Record<string, string>;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface CrmWebhookLog {
  id: string;
  organization_id: string;
  webhook_id: string;
  event_type: string;
  request_body: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  error_message: string | null;
  executed_at: string;
  crm_webhooks?: CrmWebhook;
}

// ==========================================================
// 権限グループ
// ==========================================================

export type PermissionAction = "view" | "create" | "edit" | "delete";

export interface PermissionGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionGroupPermission {
  id: string;
  group_id: string;
  resource: string;
  actions: PermissionAction[];
}

export interface MemberPermissionGroup {
  user_id: string;
  group_id: string;
  created_at: string;
}

// ==========================================================
// カスタムワークフロー
// ==========================================================

export interface WorkflowTemplateField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

export interface WorkflowTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string;
  fields: WorkflowTemplateField[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
