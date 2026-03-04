"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useQuery } from "convex/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StorageAccountSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
}

export function StorageAccountSelect({ value, onValueChange }: StorageAccountSelectProps) {
  const accounts = useQuery(api.storageAccounts.queries.listAllStorageAccounts);

  return (
    <Select value={value || "none"} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select storage account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {accounts?.map((account) => (
          <SelectItem key={account._id} value={account._id}>
            <span className="flex items-center gap-2">
              <span>{account.name || account.r2PathPrefix}</span>
              <span className="text-muted-foreground">
                ({account.users.map((u) => u.email).join(", ")} &middot;{" "}
                {formatBytes(account.totalBytesUsed)})
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
