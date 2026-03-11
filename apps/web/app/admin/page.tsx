"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useQuery } from "convex/react";
import { Crown, Eye, HardDrive, Loader2, Pencil, Plus, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePermissions } from "@/contexts/PermissionsContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "editor" | "viewer";

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
};

export default function AdminPage() {
  usePageTitle("Admin");
  const scrolled = useScrolled();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const users = useQuery(api.users.queries.listAllUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email: string;
    role: UserRole;
    hasPremium: boolean;
    storageAccountId?: Id<"storageAccounts">;
  } | null>(null);

  if (permissionsLoading) {
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

  const isLoading = users === undefined;

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 z-10 border-b bg-card/30 backdrop-blur-sm transition-all duration-200 sm:top-16">
        <div
          className={cn(
            "mx-auto max-w-7xl px-3 py-2.5 transition-all duration-200 sm:px-6 sm:py-3 lg:px-8",
            scrolled && "py-1.5 sm:py-2"
          )}
        >
          <div className="flex items-center gap-3">
            <Users
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
              User Management
            </h1>
            {users && (
              <span className="text-sm text-muted-foreground">
                {users.length} user{users.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="flex-1" />
            <Button
              onClick={() => setCreateOpen(true)}
              className={cn(
                "shrink-0 transition-all duration-200",
                scrolled ? "h-7 px-2 sm:px-3" : "h-8 px-2 sm:px-3"
              )}
            >
              <Plus
                className={cn("transition-all duration-200", scrolled ? "h-4 w-4" : "h-5 w-5")}
              />
              <span className="hidden sm:inline">Add User</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No users yet</p>
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="divide-y divide-border/50 rounded-lg bg-card/60 sm:hidden">
              {users.map((user) => (
                <div key={user._id} className="flex items-center gap-3 px-3 py-3">
                  <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{user.name || "Unnamed"}</span>
                      <Badge
                        variant={roleBadgeVariant[user.role]}
                        className="px-1 py-0 text-[10px]"
                      >
                        {user.role}
                      </Badge>
                      {user.hasPremium && <Crown className="h-3 w-3 text-yellow-500" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    {user.storageAccount && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HardDrive className="h-2.5 w-2.5" />
                        {formatBytes(user.storageAccount.totalBytesUsed)}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                    <Link href={`/admin/users/${user._id}`}>
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() =>
                      setEditingUser({
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        hasPremium: user.hasPremium,
                        storageAccountId: user.storageAccountId,
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border bg-card sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Premium
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Storage
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name || "Unnamed"}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadgeVariant[user.role]}>{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.hasPremium ? (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.storageAccount ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatBytes(user.storageAccount.totalBytesUsed)}</span>
                            <span>({user.storageAccount.fileCount} files)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/users/${user._id}`}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditingUser({
                                _id: user._id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                                hasPremium: user.hasPremium,
                                storageAccountId: user.storageAccountId,
                              })
                            }
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editingUser && (
        <EditUserDialog
          key={editingUser._id}
          user={editingUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
