"use client";

import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale/ja";
import { format, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";

registerLocale("ja", ja);

interface DatetimeInputProps {
  value: string; // "yyyy-MM-ddTHH:mm" or ""
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** この日時より前は選択不可 */
  minDateTime?: string; // "yyyy-MM-ddTHH:mm" or ""
}

/** 日時入力（react-datepicker・5分刻み） */
export function DatetimeInput({
  value,
  onChange,
  disabled,
  className,
  minDateTime,
}: DatetimeInputProps) {
  const selected = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : null;
  const minDate = minDateTime ? parse(minDateTime, "yyyy-MM-dd'T'HH:mm", new Date()) : undefined;

  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange("");
      return;
    }
    onChange(format(date, "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <DatePicker
      selected={selected}
      onChange={handleChange}
      showTimeSelect
      timeIntervals={5}
      timeFormat="HH:mm"
      dateFormat="yyyy/MM/dd HH:mm"
      locale="ja"
      disabled={disabled}
      minDate={minDate}
      minTime={
        minDate && selected && minDate.toDateString() === selected.toDateString()
          ? minDate
          : undefined
      }
      maxTime={
        minDate && selected && minDate.toDateString() === selected.toDateString()
          ? new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 55)
          : undefined
      }
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm",
        className
      )}
      calendarClassName="!font-sans"
      wrapperClassName="w-full"
      placeholderText="日時を選択"
      dayClassName={(date) => {
        const day = date.getDay();
        if (day === 0) return "datepicker-sunday";
        if (day === 6) return "datepicker-saturday";
        return "";
      }}
    />
  );
}
