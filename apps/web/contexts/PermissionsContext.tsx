"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { type UserPermissions } from "@chaptercheck/convex-backend/users/queries";
import { useQuery } from "convex/react";
import { createContext, useContext, useMemo } from "react";

type UserRole = "admin" | "editor" | "viewer";

interface PermissionsContextValue {
  // Loading state
  isLoading: boolean;

  // User info (null if not authenticated)
  user: {
    _id: Id<"users">;
    email: string;
    name?: string;
    role: UserRole;
    hasPremium: boolean;
  } | null;

  // Permission helpers
  permissions: UserPermissions | null;

  // Convenience methods
  can: (permission: keyof UserPermissions) => boolean;
  canAny: (...permissions: (keyof UserPermissions)[]) => boolean;
  canAll: (...permissions: (keyof UserPermissions)[]) => boolean;

  // Role checks
  isAdmin: boolean;
  isEditor: boolean;
  hasPremium: boolean;
  hasRoleLevel: (role: UserRole) => boolean;
}

// Role levels for comparison (higher = more permissions)
// IMPORTANT: Keep in sync with ROLE_LEVELS in convex/lib/auth.ts
const ROLE_LEVELS: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const userWithPermissions = useQuery(api.users.queries.getCurrentUserWithPermissions);

  const value = useMemo((): PermissionsContextValue => {
    const isLoading = userWithPermissions === undefined;
    const user = userWithPermissions
      ? {
          _id: userWithPermissions._id,
          email: userWithPermissions.email,
          name: userWithPermissions.name,
          role: userWithPermissions.role,
          hasPremium: userWithPermissions.hasPremium,
        }
      : null;
    const permissions = userWithPermissions?.permissions ?? null;

    const can = (permission: keyof UserPermissions): boolean => {
      if (!permissions) return false;
      return permissions[permission] === true;
    };

    const canAny = (...permissionList: (keyof UserPermissions)[]): boolean => {
      return permissionList.some((p) => can(p));
    };

    const canAll = (...permissionList: (keyof UserPermissions)[]): boolean => {
      return permissionList.every((p) => can(p));
    };

    const hasRoleLevel = (minRole: UserRole): boolean => {
      if (!user) return false;
      return ROLE_LEVELS[user.role] >= ROLE_LEVELS[minRole];
    };

    return {
      isLoading,
      user,
      permissions,
      can,
      canAny,
      canAll,
      isAdmin: permissions?.isAdmin ?? false,
      isEditor: permissions?.isEditor ?? false,
      hasPremium: permissions?.hasPremium ?? false,
      hasRoleLevel,
    };
  }, [userWithPermissions]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
