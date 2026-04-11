"use client";

import { Star } from "lucide-react";
import { cn } from "@hr1/shared-ui/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function StarRating({ value, onChange, disabled }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={cn(
            "transition-colors",
            disabled ? "cursor-default" : "cursor-pointer hover:text-yellow-400"
          )}
        >
          <Star
            className={cn(
              "h-6 w-6",
              value != null && star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        </button>
      ))}
      {value != null && <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>}
    </div>
  );
}
