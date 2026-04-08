"use client";

import { Label } from "./label";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "../../lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FormField({ label, required, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required && " *"}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface FormInputProps extends Omit<React.ComponentProps<typeof Input>, "className"> {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function FormInput({ label, required, error, className, ...inputProps }: FormInputProps) {
  return (
    <FormField label={label} required={required} error={error} className={className}>
      <Input {...inputProps} className={cn(error && "border-destructive")} />
    </FormField>
  );
}

interface FormTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, "className"> {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function FormTextarea({
  label,
  required,
  error,
  className,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <FormField label={label} required={required} error={error} className={className}>
      <Textarea {...textareaProps} className={cn(error && "border-destructive")} />
    </FormField>
  );
}
