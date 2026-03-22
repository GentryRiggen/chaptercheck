"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Loader2, MessageSquare, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

type SupportCategory = "bug_report" | "feature_request" | "general_question" | "account_issue";
type SupportStatus = "new" | "reviewed" | "resolved";
type FilterStatus = SupportStatus | "all";

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  general_question: "General Question",
  account_issue: "Account Issue",
};

const CATEGORY_COLORS: Record<SupportCategory, string> = {
  bug_report: "bg-red-500/10 text-red-600 border-red-500/20",
  feature_request: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  general_question: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  account_issue: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const STATUS_DOT_COLORS: Record<SupportStatus, string> = {
  new: "bg-blue-500",
  reviewed: "bg-yellow-500",
  resolved: "bg-green-500",
};

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Resolved", value: "resolved" },
];

export default function AdminSupportPage() {
  usePageTitle("Admin - Support");
  const scrolled = useScrolled();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "reviewed" | "resolved" | "delete";
    id: Id<"supportRequests">;
    name: string;
  } | null>(null);

  const queryStatus = filter === "all" ? undefined : filter;
  const requests = useQuery(api.supportRequests.queries.list, { status: queryStatus });
  const newCount = useQuery(api.supportRequests.queries.getNewCount);

  const updateStatus = useMutation(api.supportRequests.mutations.updateStatus);
  const removeRequest = useMutation(api.supportRequests.mutations.remove);

  const isLoading = requests === undefined;

  const toggleExpanded = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setAdminNotes("");
    } else {
      const request = requests?.find((r) => r._id === id);
      setAdminNotes(request?.adminNotes ?? "");
      setExpandedId(id);
    }
  };

  const handleUpdateStatus = async (
    id: Id<"supportRequests">,
    status: "reviewed" | "resolved",
    name: string
  ) => {
    setIsSubmitting(true);
    try {
      await updateStatus({
        id,
        status,
        adminNotes: adminNotes.trim() || undefined,
      });
      toast.success(`Marked request from ${name} as ${status}`);
      setConfirmDialog(null);
      setAdminNotes("");
    } catch {
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"supportRequests">, name: string) => {
    setIsSubmitting(true);
    try {
      await removeRequest({ id });
      toast.success(`Deleted request from ${name}`);
      setConfirmDialog(null);
      setExpandedId(null);
    } catch {
      toast.error("Failed to delete request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            <MessageSquare
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
              Support Requests
            </h1>
            {newCount !== undefined && newCount > 0 && (
              <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">
                {newCount} new
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
        {/* Filter tabs */}
        <div className="mb-4 flex gap-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={filter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.value)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No support requests</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all"
                ? "No support requests have been submitted yet."
                : `No ${filter} support requests found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const isExpanded = expandedId === request._id;
              const category = request.category as SupportCategory;
              const status = request.status as SupportStatus;

              return (
                <div key={request._id} className="overflow-hidden rounded-lg border bg-card">
                  {/* Summary row */}
                  <button
                    onClick={() => toggleExpanded(request._id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    {/* Status dot */}
                    <span
                      className={cn(
                        "flex h-2.5 w-2.5 shrink-0 rounded-full",
                        STATUS_DOT_COLORS[status]
                      )}
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{request.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {request.email}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-1.5 py-0 text-[10px] font-medium",
                            CATEGORY_COLORS[category]
                          )}
                        >
                          {CATEGORY_LABELS[category]}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {request.message.length > 80
                            ? request.message.slice(0, 80) + "..."
                            : request.message}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp + chevron */}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeDate(request.createdAt)}
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
                      {/* Full message */}
                      <div className="mb-4">
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Message
                        </h3>
                        <p className="whitespace-pre-wrap text-sm">{request.message}</p>
                      </div>

                      {/* Existing admin notes */}
                      {request.adminNotes && (
                        <div className="mb-4">
                          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Admin Notes
                          </h3>
                          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
                            {request.adminNotes}
                          </blockquote>
                        </div>
                      )}

                      {/* Admin notes input */}
                      {status !== "resolved" && (
                        <div className="mb-4">
                          <label
                            htmlFor={`notes-${request._id}`}
                            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            Add Notes (optional)
                          </label>
                          <Textarea
                            id={`notes-${request._id}`}
                            placeholder="Internal notes about this request..."
                            rows={2}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 border-t pt-4">
                        {status === "new" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setConfirmDialog({
                                type: "reviewed",
                                id: request._id,
                                name: request.name,
                              })
                            }
                          >
                            Mark as Reviewed
                          </Button>
                        )}
                        {status !== "resolved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:bg-green-500/10 hover:text-green-600"
                            onClick={() =>
                              setConfirmDialog({
                                type: "resolved",
                                id: request._id,
                                name: request.name,
                              })
                            }
                          >
                            Mark as Resolved
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setConfirmDialog({
                              type: "delete",
                              id: request._id,
                              name: request.name,
                            })
                          }
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
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
                {confirmDialog.type === "delete"
                  ? `Delete request from ${confirmDialog.name}?`
                  : `Mark as ${confirmDialog.type}?`}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog.type === "delete"
                  ? "This will permanently delete the support request. This action cannot be undone."
                  : `This will update the status of ${confirmDialog.name}'s request to "${confirmDialog.type}".`}
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
                variant={confirmDialog.type === "delete" ? "destructive" : "default"}
                className="flex-1"
                onClick={() => {
                  if (confirmDialog.type === "delete") {
                    handleDelete(confirmDialog.id, confirmDialog.name);
                  } else {
                    handleUpdateStatus(confirmDialog.id, confirmDialog.type, confirmDialog.name);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? confirmDialog.type === "delete"
                    ? "Deleting..."
                    : "Updating..."
                  : confirmDialog.type === "delete"
                    ? "Delete"
                    : `Mark as ${confirmDialog.type === "reviewed" ? "Reviewed" : "Resolved"}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
