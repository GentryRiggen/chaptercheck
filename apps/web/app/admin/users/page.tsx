"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { formatBytes } from "@chaptercheck/shared/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Crown,
  HardDrive,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldBan,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ApproveUserDialog } from "@/components/admin/ApproveUserDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { DenyUserDialog } from "@/components/admin/DenyUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { SuspendUserDialog } from "@/components/admin/SuspendUserDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "editor" | "viewer";
type StatusFilter = "all" | "active" | "pending" | "suspended";
type RoleFilter = "all" | "admin" | "editor" | "viewer";

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
};

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  approved: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  suspended: { label: "Suspended", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function AdminUsersPage() {
  usePageTitle("Admin - Users");
  const scrolled = useScrolled();

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const debouncedSearch = useDebounce(searchInput, 300);

  // Status counts for tab badges
  const counts = useQuery(api.users.queries.getUserStatusCounts);

  // Single data source
  const users = useQuery(api.users.queries.searchAndFilterUsers, {
    search: debouncedSearch || undefined,
    status: statusFilter,
    role: roleFilter,
  });

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email: string;
    role: UserRole;
    hasPremium: boolean;
    storageAccountId?: Id<"storageAccounts">;
  } | null>(null);
  const [approvingUser, setApprovingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email: string;
  } | null>(null);
  const [denyingUser, setDenyingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email: string;
  } | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email: string;
  } | null>(null);
  const [deletingUser, setDeletingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email: string;
  } | null>(null);

  const unsuspendUser = useMutation(api.users.mutations.unsuspendUser);

  const handleUnsuspend = async (userId: Id<"users">, displayName: string) => {
    try {
      await unsuspendUser({ userId });
      toast.success(`Unsuspended ${displayName}`);
    } catch {
      toast.error("Couldn't unsuspend the user. Please try again.");
    }
  };

  const isLoading = users === undefined;

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
              Users
            </h1>
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
        {/* Status Tabs */}
        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="all">All{counts ? ` (${counts.total})` : ""}</TabsTrigger>
            <TabsTrigger value="active">Active{counts ? ` (${counts.active})` : ""}</TabsTrigger>
            <TabsTrigger value="pending">Pending{counts ? ` (${counts.pending})` : ""}</TabsTrigger>
            <TabsTrigger value="suspended">
              Suspended{counts ? ` (${counts.suspended})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Role Filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {searchInput || statusFilter !== "all" || roleFilter !== "all"
                ? "No users match your filters"
                : "No users yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="divide-y divide-border/50 rounded-lg bg-card/60 sm:hidden">
              {users.map((user) => {
                const isPending = user.approvalStatus === "pending";
                const isSuspended = user.approvalStatus === "suspended";
                const isActive = user.approvalStatus === "approved";
                const displayName = user.name || "Unnamed";
                const statusConfig = statusBadgeConfig[user.approvalStatus];

                return (
                  <div key={user._id} className="flex items-center gap-3 px-3 py-3">
                    <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                    <Link href={`/admin/users/${user._id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium hover:underline">
                          {displayName}
                        </span>
                        <Badge
                          variant={roleBadgeVariant[user.role]}
                          className="px-1 py-0 text-[10px]"
                        >
                          {user.role}
                        </Badge>
                        {user.hasPremium && <Crown className="h-3 w-3 text-yellow-500" />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-1.5">
                        {statusConfig && (
                          <Badge
                            variant="outline"
                            className={cn("px-1 py-0 text-[10px]", statusConfig.className)}
                          >
                            {statusConfig.label}
                          </Badge>
                        )}
                        {user.storageAccount && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <HardDrive className="h-2.5 w-2.5" />
                            {formatBytes(user.storageAccount.totalBytesUsed)}
                          </span>
                        )}
                      </div>
                    </Link>

                    {isPending ? (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:bg-green-500/10 hover:text-green-600"
                          onClick={() =>
                            setApprovingUser({
                              _id: user._id,
                              name: user.name,
                              email: user.email,
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setDenyingUser({
                              _id: user._id,
                              name: user.name,
                              email: user.email,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
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
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {isActive && user.role !== "admin" && (
                            <DropdownMenuItem
                              onClick={() =>
                                setSuspendingUser({
                                  _id: user._id,
                                  name: user.name,
                                  email: user.email,
                                })
                              }
                            >
                              <ShieldBan className="h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {isSuspended && (
                            <DropdownMenuItem
                              onClick={() => handleUnsuspend(user._id, displayName)}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Unsuspend
                            </DropdownMenuItem>
                          )}
                          {user.role !== "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeletingUser({
                                    _id: user._id,
                                    name: user.name,
                                    email: user.email,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
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
                      Status
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
                  {users.map((user) => {
                    const isPending = user.approvalStatus === "pending";
                    const isSuspended = user.approvalStatus === "suspended";
                    const isActive = user.approvalStatus === "approved";
                    const displayName = user.name || "Unnamed";
                    const statusConfig = statusBadgeConfig[user.approvalStatus];

                    return (
                      <tr key={user._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${user._id}`}
                            className="flex items-center gap-3 hover:opacity-80"
                          >
                            <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium hover:underline">
                                {displayName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={roleBadgeVariant[user.role]}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {statusConfig && (
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statusConfig.className)}
                            >
                              {statusConfig.label}
                            </Badge>
                          )}
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
                          {isPending ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:bg-green-500/10 hover:text-green-600"
                                onClick={() =>
                                  setApprovingUser({
                                    _id: user._id,
                                    name: user.name,
                                    email: user.email,
                                  })
                                }
                              >
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() =>
                                  setDenyingUser({
                                    _id: user._id,
                                    name: user.name,
                                    email: user.email,
                                  })
                                }
                              >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Deny
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
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
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {isActive && user.role !== "admin" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSuspendingUser({
                                        _id: user._id,
                                        name: user.name,
                                        email: user.email,
                                      })
                                    }
                                  >
                                    <ShieldBan className="h-4 w-4" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                {isSuspended && (
                                  <DropdownMenuItem
                                    onClick={() => handleUnsuspend(user._id, displayName)}
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                    Unsuspend
                                  </DropdownMenuItem>
                                )}
                                {user.role !== "admin" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() =>
                                        setDeletingUser({
                                          _id: user._id,
                                          name: user.name,
                                          email: user.email,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Dialogs */}
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

      {approvingUser && (
        <ApproveUserDialog
          key={approvingUser._id}
          user={approvingUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setApprovingUser(null);
          }}
        />
      )}

      {denyingUser && (
        <DenyUserDialog
          key={denyingUser._id}
          user={denyingUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDenyingUser(null);
          }}
        />
      )}

      {suspendingUser && (
        <SuspendUserDialog
          key={suspendingUser._id}
          user={suspendingUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSuspendingUser(null);
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          key={deletingUser._id}
          user={deletingUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDeletingUser(null);
          }}
        />
      )}
    </div>
  );
}
