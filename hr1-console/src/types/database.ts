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
  role: "admin" | "employee" | "applicant";
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  hiring_type: "new_grad" | "mid_career" | null;
  graduation_year: number | null;
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
  status: "open" | "closed" | "draft";
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
  created_at: string;
}

export interface EmployeeDepartment {
  user_id: string;
  department_id: string;
  departments?: Department;
}
