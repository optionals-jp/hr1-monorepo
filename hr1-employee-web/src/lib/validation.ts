type Validator = (value: unknown) => string | null;

export const validators = {
  required: (fieldName: string): Validator => {
    return (value) => {
      if (value == null) return `${fieldName}は必須です`;
      if (typeof value === "string" && value.trim() === "") {
        return `${fieldName}は必須です`;
      }
      return null;
    };
  },

  email: (): Validator => {
    return (value) => {
      if (typeof value !== "string" || value.trim() === "") return null;
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!pattern.test(value)) {
        return "メールアドレスの形式が正しくありません";
      }
      return null;
    };
  },

  maxLength: (max: number, fieldName: string): Validator => {
    return (value) => {
      if (typeof value !== "string") return null;
      if (value.length > max) {
        return `${fieldName}は${max}文字以内で入力してください`;
      }
      return null;
    };
  },

  minLength: (min: number, fieldName: string): Validator => {
    return (value) => {
      if (typeof value !== "string" || value.trim() === "") return null;
      if (value.length < min) {
        return `${fieldName}は${min}文字以上で入力してください`;
      }
      return null;
    };
  },
};

export type ValidationRules = Record<string, Validator[]>;

export type ValidationErrors = Record<string, string>;

export function validateForm(
  rules: ValidationRules,
  values: Record<string, unknown>
): ValidationErrors | null {
  const errors: ValidationErrors = {};

  for (const [field, fieldValidators] of Object.entries(rules)) {
    const value = values[field];
    for (const validator of fieldValidators) {
      const error = validator(value);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
