export interface PipelineStage {
  name: string;
  count: number;
}

export interface KpiTrendPoint {
  month: string;
  applications: number;
  offered: number;
  withdrawn: number;
}

export interface DepartmentStat {
  department: string;
  applications: number;
  offered: number;
}

export interface EmployeeDepartmentStat {
  department: string;
  count: number;
}

export interface HiringTypeStat {
  name: string;
  value: number;
}

export interface OpenJobStat {
  id: string;
  title: string;
  department: string | null;
  applicantCount: number;
  offeredCount: number;
}
