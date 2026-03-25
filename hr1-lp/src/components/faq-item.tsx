"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100">
      <button
        className="flex w-full items-center justify-between gap-3 py-4 text-left transition-colors hover:text-gray-900 sm:gap-4 sm:py-5"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-gray-800 sm:text-[15px]">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-gray-500">{answer}</p>
        </div>
      </div>
    </div>
  );
}
