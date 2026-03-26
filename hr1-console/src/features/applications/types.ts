import type {
  Application,
  ApplicationStep,
  CustomForm,
  FormField,
  Interview,
} from "@/types/database";

export type ActiveTab = "dashboard" | "steps" | "history" | "audit";

export type ResourceStepType = "form" | "interview";

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
  handleConvertToEmployee: () => Promise<void>;

  // ステップ操作
  advanceStep: (step: ApplicationStep) => Promise<void>;
  skipStep: (step: ApplicationStep) => Promise<void>;
  unskipStep: (step: ApplicationStep) => Promise<void>;
  canActOnStep: (step: ApplicationStep) => boolean;
  currentStepOrder: number | null;

  // ステータス変更
  updateApplicationStatus: (status: string | null) => Promise<void>;

  // リロード
  load: () => Promise<void>;
}
