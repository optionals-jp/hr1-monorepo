import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "検索" }: SearchBarProps) {
  return (
    <div className="bg-white px-4 sm:px-6 md:px-8 pt-3 pb-1">
      <div className="flex items-center rounded-full bg-gray-100 px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-2"
        />
      </div>
    </div>
  );
}
