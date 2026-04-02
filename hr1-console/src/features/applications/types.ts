import type {
  Application,
  ApplicationStep,
  CustomForm,
  FormField,
  Interview,
} from "@/types/database";
import { RESOURCE_STEP_TYPES } from "@/lib/constants";

export type ActiveTab = "dashboard" | "steps" | "evaluation" | "history" | "audit";

export type ResourceStepType = (typeof RESOURCE_STEP_TYPES)[number];

export interface ApplicationProfile {
  display_name: string | null;
  email: string;
}

export interface FormSheetField {
  field: FormField;
  value: string;
}

export interface UseApplicationDetailReturn {
  application: Application | null;
  steps: ApplicationStep[];
  loading: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // フォーム回答シート
  formSheetOpen: boolean;
  setFormSheetOpen: (open: boolean) => void;
  formSheetStep: ApplicationStep | null;
  formSheetFields: FormSheetField[];
  formSheetLoading: boolean;
  openFormResponses: (step: ApplicationStep) => Promise<void>;

  // リソース選択ダイアログ
  resourceDialogOpen: boolean;
  setResourceDialogOpen: (open: boolean) => void;
  resourceDialogStep: ApplicationStep | null;
  forms: CustomForm[];
  interviews: Interview[];
  resourcesLoading: boolean;
  startStepWithResource: (resourceId: string) => Promise<void>;

  // 入社確定ダイアログ
  convertDialogOpen: boolean;
  setConvertDialogOpen: (open: boolean) => void;
  hireDate: string;
  setHireDate: (date: string) => void;
  converting: boolean;
  handleConvertToEmployee: () => Promise<{ success: boolean; error?: string }>;

  // ステップ操作
  advanceStep: (step: ApplicationStep) => Promise<void>;
  skipStep: (step: ApplicationStep) => Promise<{ success: boolean; error?: string }>;
  unskipStep: (step: ApplicationStep) => Promise<{ success: boolean; error?: string }>;
  canActOnStep: (step: ApplicationStep) => boolean;
  currentStepOrder: number | null;

  // ステータス変更
  updateApplicationStatus: (status: string | null) => Promise<void>;

  // 評価
  evaluationCount: number;

  // リロード
  load: () => Promise<void>;
}
