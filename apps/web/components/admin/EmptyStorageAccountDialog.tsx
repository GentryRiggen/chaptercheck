"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useAction, useQuery } from "convex/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmptyStorageAccountDialogProps {
  storageAccountId: Id<"storageAccounts">;
  accountLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmptyStorageAccountDialog({
  storageAccountId,
  accountLabel,
  open,
  onOpenChange,
}: EmptyStorageAccountDialogProps) {
  const summary = useQuery(
    api.storageAccounts.queries.getStorageAccountEmptySummary,
    open ? { storageAccountId } : "skip"
  );
  const emptyAccount = useAction(api.storageAccounts.actions.emptyStorageAccount);
  const [isEmptying, setIsEmptying] = useState(false);

  const handleEmpty = async () => {
    setIsEmptying(true);
    try {
      const result = await emptyAccount({ storageAccountId });
      toast.success(
        `Emptied storage account: ${result.audioFilesDeleted} audio files and ${result.r2ObjectsDeleted} R2 objects deleted`
      );
      onOpenChange(false);
    } catch {
      toast.error("Failed to empty storage account. Please try again.");
    } finally {
      setIsEmptying(false);
    }
  };

  const isLoading = summary === undefined;
  const isEmpty = summary !== null && summary !== undefined && summary.audioFilesCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Empty Storage Account
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all audio files from{" "}
            <span className="font-medium text-foreground">{accountLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : summary === null ? (
          <p className="py-4 text-sm text-muted-foreground">Storage account not found.</p>
        ) : isEmpty ? (
          <p className="py-4 text-sm text-muted-foreground">
            This storage account is already empty.
          </p>
        ) : (
          <div className="space-y-3">
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm"
            >
              <p>
                This will permanently delete:{" "}
                <span className="font-semibold">
                  {summary.audioFilesCount} audio file{summary.audioFilesCount !== 1 ? "s" : ""}
                </span>{" "}
                ({formatBytes(summary.totalBytes)}) across{" "}
                <span className="font-semibold">
                  {summary.distinctBooksCount} book{summary.distinctBooksCount !== 1 ? "s" : ""}
                </span>{" "}
                for{" "}
                <span className="font-semibold">
                  {summary.assignedUsersCount} user{summary.assignedUsersCount !== 1 ? "s" : ""}
                </span>
                .
              </p>
            </div>

            {summary.assignedUsers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Affected users</p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.assignedUsers.map((user) => (
                    <span
                      key={user._id}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                    >
                      {user.name || user.email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isEmptying}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleEmpty}
            disabled={isLoading || isEmpty || summary === null || isEmptying}
          >
            {isEmptying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Emptying...
              </>
            ) : (
              "Empty account"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
