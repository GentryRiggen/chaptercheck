"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useAction, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteUserDialogProps {
  user: {
    _id: Id<"users">;
    name?: string;
    email: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If true, navigate to /admin/users on successful deletion */
  redirectOnDelete?: boolean;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  redirectOnDelete = false,
}: DeleteUserDialogProps) {
  const router = useRouter();
  const adminDeleteUser = useAction(api.users.deleteAccount.adminDeleteUser);
  const summary = useQuery(
    api.users.queries.getAdminUserDeletionSummary,
    open ? { userId: user._id } : "skip"
  );
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await adminDeleteUser({ userId: user._id });
      toast.success(`Deleted ${user.name || user.email}`);
      onOpenChange(false);
      if (redirectOnDelete) {
        router.push("/admin/users");
      }
    } catch {
      toast.error("Couldn't delete the user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmed(false);
    }
    onOpenChange(nextOpen);
  };

  const counts = summary?.counts;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {user.name || user.email}?</DialogTitle>
          <DialogDescription>
            This will permanently delete the user and all their data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm font-medium">{user.name || "Unnamed"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {summary === undefined ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : summary === null ? (
          <p className="text-sm text-muted-foreground">User not found.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Data that will be deleted:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {counts && counts.totalBookEntries > 0 && (
                <li>
                  {counts.totalBookEntries} book{" "}
                  {counts.totalBookEntries === 1 ? "record" : "records"}
                  {counts.ratingsCount > 0 && ` (${counts.ratingsCount} ratings)`}
                  {counts.reviewsCount > 0 && ` (${counts.reviewsCount} reviews)`}
                </li>
              )}
              {counts && counts.shelvesCount > 0 && (
                <li>
                  {counts.shelvesCount} {counts.shelvesCount === 1 ? "shelf" : "shelves"} with{" "}
                  {counts.totalShelfBooks} {counts.totalShelfBooks === 1 ? "book" : "books"}
                </li>
              )}
              {counts && counts.bookNotesCount > 0 && (
                <li>
                  {counts.bookNotesCount} {counts.bookNotesCount === 1 ? "note" : "notes"}
                </li>
              )}
              {counts && counts.listeningProgressCount > 0 && (
                <li>
                  {counts.listeningProgressCount} listening progress{" "}
                  {counts.listeningProgressCount === 1 ? "record" : "records"}
                </li>
              )}
              {counts && counts.audioFilesCount > 0 && (
                <li>
                  {counts.audioFilesCount} audio {counts.audioFilesCount === 1 ? "file" : "files"} (
                  {formatBytes(counts.totalAudioBytes)}) across {counts.distinctBooksWithAudio}{" "}
                  {counts.distinctBooksWithAudio === 1 ? "book" : "books"}
                </li>
              )}
              {counts &&
                (counts.followsAsFollowerCount > 0 || counts.followsAsFollowingCount > 0) && (
                  <li>
                    {counts.followsAsFollowerCount} following, {counts.followsAsFollowingCount}{" "}
                    followers
                  </li>
                )}
              {counts && counts.bookGenreVotesCount > 0 && (
                <li>{counts.bookGenreVotesCount} genre votes</li>
              )}
              {summary.storageAccount?.isSoleUser && (
                <li className="font-medium text-destructive">
                  Storage account &quot;{summary.storageAccount.accountName}&quot; will be unlinked
                  (sole user)
                </li>
              )}
            </ul>
          </div>
        )}

        <label className="flex items-start gap-2 pt-1">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm">
            I understand this action is permanent and cannot be undone
          </span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={!confirmed || isSubmitting || summary === undefined}
          >
            {isSubmitting ? "Deleting..." : "Delete permanently"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
