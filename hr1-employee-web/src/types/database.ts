export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "employee" | "applicant";
  organization_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  organization_id: string;
  subject: string | null;
  body: string;
  read: boolean;
  created_at: string;
}
