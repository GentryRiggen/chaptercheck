"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  Loader2,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

type ReportReason = "spam" | "inappropriate_content" | "harassment" | "impersonation" | "other";

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  inappropriate_content: "Inappropriate content",
  harassment: "Harassment",
  impersonation: "Impersonation",
  other: "Other",
};

const REASON_COLORS: Record<ReportReason, string> = {
  spam: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  inappropriate_content: "bg-red-500/10 text-red-600 border-red-500/20",
  harassment: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  impersonation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export default function AdminReportsPage() {
  usePageTitle("Admin - Reports");
  const scrolled = useScrolled();

  const reportGroups = useQuery(api.reports.queries.getPendingReportsGrouped);
  const pendingCount = useQuery(api.reports.queries.getPendingReportCount);

  const dismissReports = useMutation(api.reports.mutations.adminDismissReports);
  const actionReports = useMutation(api.reports.mutations.adminActionReports);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "dismiss" | "suspend";
    reportedUserId: Id<"users">;
    userName: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = reportGroups === undefined;

  const handleDismiss = async (reportedUserId: Id<"users">, userName: string) => {
    setIsSubmitting(true);
    try {
      await dismissReports({ reportedUserId });
      toast.success(`Dismissed all reports for ${userName}`);
      setConfirmDialog(null);
      setExpandedGroup(null);
    } catch {
      toast.error("Failed to dismiss reports. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async (reportedUserId: Id<"users">, userName: string) => {
    setIsSubmitting(true);
    try {
      await actionReports({ reportedUserId, action: "suspend" });
      toast.success(`Suspended ${userName} and resolved reports`);
      setConfirmDialog(null);
      setExpandedGroup(null);
    } catch {
      toast.error("Failed to suspend user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedGroup((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-14 z-10 border-b bg-card/30 backdrop-blur-sm transition-all duration-200 sm:top-16">
        <div
          className={cn(
            "mx-auto max-w-7xl px-3 py-2.5 transition-all duration-200 sm:px-6 sm:py-3 lg:px-8",
            scrolled && "py-1.5 sm:py-2"
          )}
        >
          <div className="flex items-center gap-3">
            <Flag
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
              Reports
            </h1>
            {pendingCount !== undefined && pendingCount > 0 && (
              <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600">
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reportGroups.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No pending reports</p>
            <p className="mt-1 text-sm text-muted-foreground">
              All reports have been reviewed. Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reportGroups.map((group) => {
              const isExpanded = expandedGroup === group.reportedUserId;
              const userName = group.reportedUser?.name || "Unknown user";

              return (
                <div
                  key={group.reportedUserId}
                  className="overflow-hidden rounded-lg border bg-card"
                >
                  {/* Summary row */}
                  <button
                    onClick={() => toggleExpanded(group.reportedUserId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    {/* Status dot */}
                    <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />

                    {/* User avatar and name */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {group.reportedUser ? (
                        <UserAvatar
                          name={group.reportedUser.name}
                          imageUrl={group.reportedUser.imageUrl}
                          size="sm"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                          <span className="text-xs text-muted-foreground">?</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{userName}</span>
                          <Badge
                            variant="outline"
                            className="border-red-500/20 bg-red-500/10 px-1.5 py-0 text-[10px] text-red-600"
                          >
                            {group.reportCount} {group.reportCount === 1 ? "report" : "reports"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {group.reasons.map((reason) => (
                            <span
                              key={reason}
                              className={cn(
                                "inline-flex rounded-full border px-1.5 py-0 text-[10px] font-medium",
                                REASON_COLORS[reason as ReportReason]
                              )}
                            >
                              {REASON_LABELS[reason as ReportReason] || reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp + chevron */}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeDate(group.mostRecentTimestamp)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-4 py-4">
                      {/* Individual reports */}
                      <div className="mb-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Individual Reports
                        </h3>
                        {group.reports.map((report) => (
                          <div key={report._id} className="rounded-lg border bg-background/70 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{report.reporterName}</p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "mt-1 text-[10px]",
                                    REASON_COLORS[report.reason as ReportReason]
                                  )}
                                >
                                  {REASON_LABELS[report.reason as ReportReason] || report.reason}
                                </Badge>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelativeDate(report.createdAt)}
                              </span>
                            </div>
                            {report.reasonText && (
                              <blockquote className="mt-2 border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
                                {report.reasonText}
                              </blockquote>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmDialog({
                              type: "dismiss",
                              reportedUserId: group.reportedUserId as Id<"users">,
                              userName,
                            })
                          }
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Dismiss All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
                          onClick={() =>
                            setConfirmDialog({
                              type: "suspend",
                              reportedUserId: group.reportedUserId as Id<"users">,
                              userName,
                            })
                          }
                        >
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                          Suspend User
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          asChild
                        >
                          <Link href={`/admin/users/${group.reportedUserId}`}>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete User
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/users/${group.reportedUserId}`}>
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setConfirmDialog(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {confirmDialog.type === "dismiss"
                  ? `Dismiss reports for ${confirmDialog.userName}?`
                  : `Suspend ${confirmDialog.userName}?`}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog.type === "dismiss"
                  ? "All pending reports for this user will be dismissed and auto-blocks from reporters will be removed."
                  : "This user will be suspended and lose access to the application. All pending reports will be marked as actioned."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDialog(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmDialog.type === "dismiss" ? "default" : "destructive"}
                className="flex-1"
                onClick={() => {
                  if (confirmDialog.type === "dismiss") {
                    handleDismiss(confirmDialog.reportedUserId, confirmDialog.userName);
                  } else {
                    handleSuspend(confirmDialog.reportedUserId, confirmDialog.userName);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? confirmDialog.type === "dismiss"
                    ? "Dismissing..."
                    : "Suspending..."
                  : confirmDialog.type === "dismiss"
                    ? "Dismiss All"
                    : "Suspend User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
