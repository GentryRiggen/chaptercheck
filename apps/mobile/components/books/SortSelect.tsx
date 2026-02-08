import { Select, type SelectOption } from "@/components/ui/select";

type SortOption = "title_asc" | "title_desc" | "recent" | "top_rated";

const SORT_OPTIONS: SelectOption[] = [
  { label: "Title A-Z", value: "title_asc" },
  { label: "Title Z-A", value: "title_desc" },
  { label: "Recently Added", value: "recent" },
  { label: "Top Rated", value: "top_rated" },
];

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SortOption)}
      options={SORT_OPTIONS}
      placeholder="Sort by..."
      className={className}
    />
  );
}

export { SortSelect, type SortOption, type SortSelectProps };
