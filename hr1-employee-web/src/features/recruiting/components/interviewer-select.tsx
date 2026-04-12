"use client";

import { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@hr1/shared-ui/components/ui/popover";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { ChevronsUpDown, X } from "lucide-react";
import { cn } from "@hr1/shared-ui/lib/utils";
import type { Profile } from "@/types/database";

interface InterviewerSelectProps {
  employees: Profile[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function InterviewerSelect({
  employees,
  selectedIds,
  onSelectionChange,
}: InterviewerSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const removeEmployee = (id: string) => {
    onSelectionChange(selectedIds.filter((sid) => sid !== id));
  };

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length}名 選択中` : "面接官を選択"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">社員がいません</p>
            ) : (
              employees.map((employee) => (
                <label
                  key={employee.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                    selectedIds.includes(employee.id) && "bg-accent"
                  )}
                >
                  <Checkbox
                    checked={selectedIds.includes(employee.id)}
                    onCheckedChange={() => toggleEmployee(employee.id)}
                  />
                  <span>{employee.display_name ?? employee.email}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedEmployees.map((emp) => (
            <Badge key={emp.id} variant="secondary" className="gap-1">
              {emp.display_name ?? emp.email}
              <span
                role="button"
                onClick={() => removeEmployee(emp.id)}
                className="ml-0.5 hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
