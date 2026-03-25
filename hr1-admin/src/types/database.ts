// ---------------------------------------------------------------------------
// HR1 Admin 型定義
// ---------------------------------------------------------------------------

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
  role: "admin" | "employee" | "applicant" | "hr1_admin";
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_employees: number | null;
  description: string | null;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  organization_id: string;
  plan_id: string;
  status: "active" | "trial" | "suspended" | "cancelled";
  contracted_employees: number;
  monthly_price: number;
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // JOINed fields
  organizations?: Organization;
  plans?: Plan;
}

export interface ContractChange {
  id: string;
  contract_id: string;
  changed_by: string | null;
  change_type:
    | "created"
    | "plan_changed"
    | "employees_changed"
    | "suspended"
    | "cancelled"
    | "renewed"
    | "updated";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  // JOINed fields
  profiles?: Pick<Profile, "display_name" | "email">;
}
