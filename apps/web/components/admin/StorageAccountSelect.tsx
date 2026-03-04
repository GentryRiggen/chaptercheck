"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useQuery } from "convex/react";
import { HardDrive } from "lucide-react";

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

function getAccountLabel(account: {
  name?: string;
  users: Array<{ name?: string; email: string }>;
}) {
  if (account.name) return account.name;
  // Use the first user's name or email as a fallback label
  const firstUser = account.users[0];
  if (!firstUser) return "Unnamed account";
  return firstUser.name || firstUser.email.split("@")[0];
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
            <div className="flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{getAccountLabel(account)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatBytes(account.totalBytesUsed)} &middot; {account.fileCount} files &middot;{" "}
                {account.users.length} user{account.users.length !== 1 ? "s" : ""}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
