"use client";

import { usePermissions } from "@/contexts/PermissionsContext";

type UserRole = "admin" | "editor" | "viewer";

interface RoleGateProps {
  /** Minimum role required to show children */
  minRole: UserRole;
  /** Content to show when user has the required role */
  children: React.ReactNode;
  /** Optional fallback to show when user lacks permission (default: null/hidden) */
  fallback?: React.ReactNode;
  /** Optional content to show while loading (default: null) */
  loading?: React.ReactNode;
}

/**
 * Conditionally renders children based on user's role level.
 * Hides content when user lacks the required role (role-based features should be hidden, not disabled).
 *
 * Usage:
 * ```tsx
 * <RoleGate minRole="editor">
 *   <Button>Edit</Button>
 * </RoleGate>
 * ```
 */
export function RoleGate({ minRole, children, fallback = null, loading = null }: RoleGateProps) {
  const { isLoading, hasRoleLevel } = usePermissions();

  // Show loading fallback while permissions are being fetched
  if (isLoading) {
    return <>{loading}</>;
  }

  if (!hasRoleLevel(minRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
