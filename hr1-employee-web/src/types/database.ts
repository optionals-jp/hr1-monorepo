export type ProfileRole = "admin" | "employee" | "applicant" | "manager" | "approver" | "hr1_admin";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  role: ProfileRole;
  avatar_url: string | null;
  position: string | null;
  department: string | null;
  name_kana: string | null;
  phone: string | null;
  hire_date: string | null;
  birth_date: string | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
  hiring_type?: "new_grad" | "mid_career" | null;
  graduation_year?: number | null;
  invited_at?: string | null;
  current_postal_code?: string | null;
  current_prefecture?: string | null;
  current_city?: string | null;
  current_street_address?: string | null;
  current_building?: string | null;
  school_name?: string | null;
  school_faculty?: string | null;
  work_history?: string | null;
  skills?: string | null;
  self_introduction?: string | null;
}

// ==========================================================
// 採用（Jobs / Applications）
// ==========================================================

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
  form_id: string | null;
  interview_id: string | null;
}

export interface SelectionStepTemplate {
  id: string;
  organization_id: string;
  name: string;
  step_type: "screening" | "form" | "interview" | "external_test" | "offer";
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  form_id: string | null;
  interview_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  applicant_action_at: string | null;
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
  interviews?: { title: string; location: string | null; notes?: string | null };
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
  applicant_id: string;
  field_id: string;
  value: string;
  submitted_at: string;
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

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
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
  job_titles?: string | null;
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

// ==========================================================
// CRM
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
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: BcLeadSource;
  status: BcLeadStatus;
  assigned_to: string | null;
  notes: string | null;
  converted_company_id: string | null;
  converted_contact_id: string | null;
  converted_deal_id: string | null;
  converted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

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
// FAQ
// ==========================================================

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

// ==========================================================
// お知らせ
// ==========================================================

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

// ==========================================================
// 通知
// ==========================================================

export interface AttendancePunch {
  id: string;
  organization_id: string;
  user_id: string;
  punch_type: "clock_in" | "clock_out" | "break_start" | "break_end";
  punched_at: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  work_minutes: number;
  overtime_minutes: number;
  status: "present" | "absent" | "late" | "early_leave" | "paid_leave" | "half_leave" | "holiday";
  note: string | null;
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
}

export interface ShiftRequest {
  id: string;
  organization_id: string;
  user_id: string;
  target_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  submitted_at: string;
  created_at: string;
}

export interface ShiftSchedule {
  id: string;
  organization_id: string;
  user_id: string;
  target_date: string;
  start_time: string;
  end_time: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
}

export interface ComplianceAlert {
  id: string;
  organization_id: string;
  user_id: string | null;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface PayslipAllowance {
  label: string;
  amount: number;
}

export interface PayslipDeduction {
  label: string;
  amount: number;
}

export interface Payslip {
  id: string;
  organization_id: string;
  user_id: string;
  year: number;
  month: number;
  base_salary: number;
  allowances: PayslipAllowance[];
  deductions: PayslipDeduction[];
  gross_pay: number;
  net_pay: number;
  note: string | null;
  created_at: string;
  updated_at: string;
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

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMin: number;
  applicantName?: string;
  applicantEmail?: string;
  jobTitle?: string;
  location?: string;
  status?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

// ==========================================================
// サービスリクエスト
// ==========================================================

export interface ServiceRequest {
  id: string;
  organization_id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
}

// ==========================================================
// タスク
// ==========================================================

export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface EmployeeTask {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  task_assignees?: TaskAssignee[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  status: "pending" | "in_progress" | "completed";
  completed_at: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string };
}

// ==========================================================
// プロジェクト
// ==========================================================

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  profiles?: { display_name: string | null; email: string; avatar_url: string | null };
}

// ==========================================================
// サーベイ
// ==========================================================

export interface PulseSurvey {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  target: "applicant" | "employee" | "both";
  status: "draft" | "active" | "closed";
  deadline: string | null;
  created_at: string;
  updated_at: string;
  question_count?: number;
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
}

export interface PulseSurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  value: string;
  created_at: string;
}

// ==========================================================
// ワークフロー申請
// ==========================================================

export type WorkflowRequestType = "paid_leave" | "overtime" | "business_trip" | "expense";
export type WorkflowRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface WorkflowRequest {
  id: string;
  organization_id: string;
  user_id: string;
  request_type: WorkflowRequestType;
  status: WorkflowRequestStatus;
  request_data: Record<string, unknown>;
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================================
// 評価
// ==========================================================

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

export interface EvaluationCycle {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  template_id: string;
  status: "draft" | "active" | "closed" | "calibrating" | "finalized";
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationAssignment {
  id: string;
  cycle_id: string;
  target_user_id: string;
  evaluator_id: string;
  rater_type: "supervisor" | "peer" | "subordinate" | "self" | "external";
  evaluation_id: string | null;
  status: "pending" | "in_progress" | "submitted" | "skipped";
  due_date: string | null;
  created_at: string;
  target_profile?: { display_name: string | null; email: string };
  evaluator_profile?: { display_name: string | null; email: string };
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

export interface Evaluation {
  id: string;
  organization_id: string;
  template_id: string;
  target_user_id: string;
  evaluator_id: string;
  cycle_id: string | null;
  rater_type: string | null;
  assignment_id: string | null;
  application_id: string | null;
  status: "draft" | "submitted";
  overall_comment: string | null;
  created_at: string;
  submitted_at: string | null;
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number | null;
  value: string | null;
  comment: string | null;
}

export interface EvaluationAnchor {
  id: string;
  criterion_id: string;
  score_value: number;
  description: string;
}

// ==========================================================
// 勤怠補正申請
// ==========================================================

export interface AttendanceCorrection {
  id: string;
  organization_id: string;
  record_id: string;
  user_id: string;
  original_clock_in: string | null;
  original_clock_out: string | null;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  punch_corrections: Record<string, unknown> | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================================
// ダッシュボードウィジェット設定
// ==========================================================

export interface DashboardWidgetConfig {
  widget_id: string;
  visible: boolean;
  sort_order: number;
}

export interface DashboardWidgetPreference {
  id: string;
  user_id: string;
  organization_id: string;
  product_tab: "recruiting" | "workspace" | "client";
  widget_config: DashboardWidgetConfig[];
  updated_at: string;
}

// ==========================================================
// ワークフローテンプレート
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
  icon: string | null;
  fields: WorkflowTemplateField[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
