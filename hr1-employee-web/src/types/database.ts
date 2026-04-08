export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "employee" | "applicant";
  organization_id: string | null;
  avatar_url: string | null;
  position: string | null;
  created_at: string;
  updated_at: string;
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

export interface AttendanceRecord {
  id: string;
  profile_id: string;
  organization_id: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  assignee_id: string | null;
  organization_id: string;
  due_date: string | null;
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
  bc_companies?: BcCompany;
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
  status: "open" | "won" | "lost";
  stage: string;
  probability: number | null;
  expected_close_date: string | null;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
  bc_companies?: BcCompany;
  bc_contacts?: BcContact;
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
  bc_contacts?: BcContact;
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
  bc_companies?: BcCompany;
  bc_contacts?: BcContact;
  bc_deals?: BcDeal;
  bc_quote_items?: BcQuoteItem[];
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
