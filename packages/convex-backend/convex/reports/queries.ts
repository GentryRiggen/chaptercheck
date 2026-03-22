import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/auth";

/**
 * Admin: get pending reports grouped by reported user.
 * Each group includes the reported user's info, report count, reasons, and individual reports.
 */
export const getPendingReportsGrouped = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const pendingReports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    if (pendingReports.length === 0) return [];

    // Group by reportedUserId
    const groupMap = new Map<
      string,
      {
        reportedUserId: string;
        reports: typeof pendingReports;
      }
    >();

    for (const report of pendingReports) {
      const key = report.reportedUserId;
      const existing = groupMap.get(key);
      if (existing) {
        existing.reports.push(report);
      } else {
        groupMap.set(key, {
          reportedUserId: key,
          reports: [report],
        });
      }
    }

    // Fetch user info and reporter info, then assemble groups
    const groups = await Promise.all(
      [...groupMap.values()].map(async (group) => {
        const reportedUser = await ctx.db.get(group.reportedUserId as Id<"users">);

        // Get unique reasons
        const reasons = [...new Set(group.reports.map((r) => r.reason))];

        // Sort by createdAt descending
        group.reports.sort((a, b) => b.createdAt - a.createdAt);

        const mostRecentTimestamp = group.reports[0].createdAt;

        // Enrich individual reports with reporter name
        const enrichedReports = await Promise.all(
          group.reports.map(async (report) => {
            const reporter = await ctx.db.get(report.reporterId);
            return {
              _id: report._id,
              reporterName: reporter?.name ?? "Unknown user",
              reason: report.reason,
              reasonText: report.reasonText,
              createdAt: report.createdAt,
            };
          })
        );

        return {
          reportedUserId: group.reportedUserId,
          reportedUser: reportedUser
            ? {
                _id: reportedUser._id,
                name: reportedUser.name,
                imageUrl: reportedUser.imageUrl,
              }
            : null,
          reportCount: group.reports.length,
          reasons,
          mostRecentTimestamp,
          reports: enrichedReports,
        };
      })
    );

    // Sort groups by most recent report first
    groups.sort((a, b) => b.mostRecentTimestamp - a.mostRecentTimestamp);

    return groups;
  },
});

/**
 * Admin: get count of unique users with pending reports (for badge in sidebar).
 */
export const getPendingReportCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const pendingReports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const uniqueUsers = new Set(pendingReports.map((r) => r.reportedUserId));
    return uniqueUsers.size;
  },
});

/**
 * Admin: get all reports for a specific user (all statuses), sorted by createdAt descending.
 */
export const getReportsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_reported_user", (q) => q.eq("reportedUserId", args.userId))
      .collect();

    reports.sort((a, b) => b.createdAt - a.createdAt);

    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const reporter = await ctx.db.get(report.reporterId);
        return {
          ...report,
          reporterName: reporter?.name ?? "Unknown user",
        };
      })
    );

    return enrichedReports;
  },
});
