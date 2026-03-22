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
import { cn } from "@/lib/utils";

type ReportReason = "spam" | "inappropriate_content" | "harassment" | "impersonation" | "other";

const REASON_OPTIONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Unwanted or repetitive content" },
  {
    value: "inappropriate_content",
    label: "Inappropriate content",
    description: "Content that violates community guidelines",
  },
  { value: "harassment", label: "Harassment", description: "Threatening or bullying behavior" },
  {
    value: "impersonation",
    label: "Impersonation",
    description: "Pretending to be someone else",
  },
  { value: "other", label: "Other", description: "Something else not listed above" },
];

interface ReportUserDialogProps {
  userId: Id<"users">;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportUserDialog({ userId, userName, open, onOpenChange }: ReportUserDialogProps) {
  const reportUser = useMutation(api.reports.mutations.reportUser);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await reportUser({
        reportedUserId: userId,
        reason: selectedReason,
        reasonText: reasonText.trim() || undefined,
      });
      toast.success(`Reported ${userName}. The user has also been blocked.`);
      resetAndClose();
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSelectedReason(null);
    setReasonText("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetAndClose();
        else onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {userName}</DialogTitle>
          <DialogDescription>
            Select a reason for reporting this user. They will also be blocked so you no longer see
            their content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {REASON_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedReason(option.value)}
              className={cn(
                "flex w-full flex-col rounded-lg border p-3 text-left transition-colors",
                selectedReason === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="report-details" className="text-sm font-medium">
            Additional details (optional)
          </label>
          <Textarea
            id="report-details"
            placeholder="Provide any additional context..."
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={resetAndClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
