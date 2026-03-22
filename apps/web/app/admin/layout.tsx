"use client";

import { Loader2, ShieldAlert } from "lucide-react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { usePermissions } from "@/contexts/PermissionsContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground">You need admin access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
