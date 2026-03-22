"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useQuery } from "convex/react";
import { Flag, HardDrive, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/support", label: "Support", icon: MessageSquare },
  { href: "/admin/storage", label: "Storage", icon: HardDrive },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const pendingReportCount = useQuery(api.reports.queries.getPendingReportCount);
  const newSupportCount = useQuery(api.supportRequests.queries.getNewCount);

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-48 shrink-0 border-r bg-card/30 md:block">
        <nav className="sticky top-14 p-3 sm:top-16">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const badgeCount =
                item.href === "/admin/reports"
                  ? pendingReportCount
                  : item.href === "/admin/support"
                    ? newSupportCount
                    : undefined;
              const showBadge = badgeCount !== undefined && badgeCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {showBadge && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Mobile horizontal tabs */}
      <div className="border-b bg-card/30 md:hidden">
        <nav className="flex gap-1 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badgeCount =
              item.href === "/admin/reports"
                ? pendingReportCount
                : item.href === "/admin/support"
                  ? newSupportCount
                  : undefined;
            const showBadge = badgeCount !== undefined && badgeCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {showBadge && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
