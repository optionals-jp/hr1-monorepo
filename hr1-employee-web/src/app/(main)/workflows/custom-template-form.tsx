"use client";

import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import type { WorkflowTemplate } from "@/types/database";

interface CustomTemplateFormProps {
  template: WorkflowTemplate;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function CustomTemplateForm({ template, values, onChange }: CustomTemplateFormProps) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-3">
      {template.fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label>
            {field.label}
            {field.required && " *"}
          </Label>
          {field.type === "textarea" ? (
            <textarea
              value={values[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              required={field.required}
            />
          ) : field.type === "select" ? (
            <Select
              value={values[field.key] ?? ""}
              onValueChange={(v) => handleChange(field.key, v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              value={values[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              required={field.required}
            />
          )}
        </div>
      ))}
    </div>
  );
}
