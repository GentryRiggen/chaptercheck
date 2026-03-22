"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
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

interface PendingUser {
  _id: Id<"users">;
  name?: string;
  email: string;
}

interface DenyUserDialogProps {
  user: PendingUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DenyUserDialog({ user, open, onOpenChange }: DenyUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeny = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Couldn't deny the user. Please try again.");
        return;
      }

      toast.success(`Denied ${user.name || user.email}`);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't deny the user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deny User</DialogTitle>
          <DialogDescription>
            Are you sure you want to deny this user? This will permanently delete their account.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm font-medium">{user.name || "Unnamed"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
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
            onClick={handleDeny}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Denying..." : "Deny User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
