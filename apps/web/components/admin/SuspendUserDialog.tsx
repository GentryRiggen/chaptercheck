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
import { Textarea } from "@/components/ui/textarea";

interface SuspendUserDialogProps {
  user: {
    _id: Id<"users">;
    name?: string;
    email: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendUserDialog({ user, open, onOpenChange }: SuspendUserDialogProps) {
  const suspendUser = useMutation(api.users.mutations.suspendUser);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuspend = async () => {
    setIsSubmitting(true);
    try {
      await suspendUser({
        userId: user._id,
        reason: reason.trim() || undefined,
      });
      toast.success(`Suspended ${user.name || user.email}`);
      setReason("");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't suspend the user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {user.name || user.email}?</DialogTitle>
          <DialogDescription>
            This user will lose access to the application until unsuspended.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm font-medium">{user.name || "Unnamed"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="suspend-reason" className="text-sm font-medium">
            Reason (optional)
          </label>
          <Textarea
            id="suspend-reason"
            placeholder="Why is this user being suspended?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
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
            onClick={handleSuspend}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Suspending..." : "Suspend User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
