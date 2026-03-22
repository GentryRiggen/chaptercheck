"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useQuery } from "convex/react";
import { HardDrive, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyStorageAccountDialog } from "@/components/admin/EmptyStorageAccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

function getAccountLabel(account: {
  name?: string;
  users: Array<{ name?: string; email: string }>;
}) {
  if (account.name) return account.name;
  const firstUser = account.users[0];
  if (!firstUser) return "Unnamed account";
  return firstUser.name || firstUser.email.split("@")[0];
}

export default function AdminStoragePage() {
  usePageTitle("Admin - Storage");
  const scrolled = useScrolled();
  const accounts = useQuery(api.storageAccounts.queries.listAllStorageAccounts);
  const [emptyingAccount, setEmptyingAccount] = useState<{
    _id: Id<"storageAccounts">;
    label: string;
  } | null>(null);

  const isLoading = accounts === undefined;

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 z-10 border-b bg-card/30 backdrop-blur-sm transition-all duration-200 sm:top-16">
        <div
          className={cn(
            "mx-auto max-w-7xl px-3 py-2.5 transition-all duration-200 sm:px-6 sm:py-3 lg:px-8",
            scrolled && "py-1.5 sm:py-2"
          )}
        >
          <div className="flex items-center gap-3">
            <HardDrive
              className={cn(
                "shrink-0 text-muted-foreground transition-all duration-200",
                scrolled ? "h-4 w-4" : "h-5 w-5"
              )}
            />
            <h1
              className={cn(
                "shrink-0 font-bold transition-all duration-200",
                scrolled ? "text-sm sm:text-lg" : "text-lg sm:text-xl"
              )}
            >
              Storage Accounts
            </h1>
            {accounts && (
              <span className="text-sm text-muted-foreground">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HardDrive className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold text-muted-foreground">No storage accounts yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Storage accounts are created when users are assigned storage.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="divide-y divide-border/50 rounded-lg bg-card/60 sm:hidden">
              {accounts.map((account) => {
                const label = getAccountLabel(account);
                return (
                  <div key={account._id} className="space-y-2 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{label}</span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setEmptyingAccount({ _id: account._id, label })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatBytes(account.totalBytesUsed)}</span>
                      <span>
                        {account.fileCount} file{account.fileCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {account.users.length} user{account.users.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {account.users.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {account.users.map((user) => (
                          <Badge
                            key={user._id}
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {user.name || user.email}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border bg-card sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Bytes Used
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Files
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Assigned Users
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {accounts.map((account) => {
                    const label = getAccountLabel(account);
                    return (
                      <tr key={account._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">{label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatBytes(account.totalBytesUsed)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{account.fileCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          {account.users.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {account.users.map((user) => (
                                <Badge
                                  key={user._id}
                                  variant="secondary"
                                  className="px-1.5 py-0 text-xs"
                                >
                                  {user.name || user.email}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setEmptyingAccount({ _id: account._id, label })}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Empty
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {emptyingAccount && (
        <EmptyStorageAccountDialog
          key={emptyingAccount._id}
          storageAccountId={emptyingAccount._id}
          accountLabel={emptyingAccount.label}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEmptyingAccount(null);
          }}
        />
      )}
    </div>
  );
}
