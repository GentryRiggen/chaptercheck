"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation } from "convex/react";
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

interface BlockUserDialogProps {
  userId: Id<"users">;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockUserDialog({ userId, userName, open, onOpenChange }: BlockUserDialogProps) {
  const blockUser = useMutation(api.blocks.mutations.blockUser);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await blockUser({ blockedUserId: userId });
      toast.success(`Blocked ${userName}`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to block user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Block {userName}?</DialogTitle>
          <DialogDescription>
            Blocking this user will hide their content from you and remove any follows between you.
            They will not be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleBlock}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Blocking..." : "Block User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
