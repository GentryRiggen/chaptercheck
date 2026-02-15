import { Select, type SelectOption } from "@/components/ui/select";

type AuthorSortOption = "name_asc" | "name_desc" | "recent";

const SORT_OPTIONS: SelectOption[] = [
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Recently Added", value: "recent" },
];

interface AuthorSortSelectProps {
  value: AuthorSortOption;
  onChange: (value: AuthorSortOption) => void;
}

function AuthorSortSelect({ value, onChange }: AuthorSortSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AuthorSortOption)}
      options={SORT_OPTIONS}
      placeholder="Sort by..."
    />
  );
}

export { AuthorSortSelect, type AuthorSortOption };
