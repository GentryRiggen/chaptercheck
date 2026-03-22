"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermissions } from "@/contexts/PermissionsContext";

interface ApprovalGateProps {
  /** Content to wrap with approval gating */
  children: React.ReactNode;
  /** Optional fallback to show instead of the default disabled + tooltip treatment */
  fallback?: React.ReactNode;
  /** Optional content to show while loading (default: null) */
  loading?: React.ReactNode;
}

/**
 * Wraps content with approval gating for pending and suspended users.
 * Shows children as disabled with a tooltip explaining the restriction.
 *
 * Usage:
 * ```tsx
 * <ApprovalGate>
 *   <Button>Add to shelf</Button>
 * </ApprovalGate>
 * ```
 */
export function ApprovalGate({ children, fallback, loading = null }: ApprovalGateProps) {
  const { isLoading, isPending, isSuspended } = usePermissions();

  if (isLoading) {
    return <>{loading}</>;
  }

  if (!isPending && !isSuspended) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const tooltipMessage = isSuspended
    ? "Your account has been suspended"
    : "Available after account approval";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="pointer-events-auto cursor-not-allowed">
            <div className="pointer-events-none opacity-50">{children}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
