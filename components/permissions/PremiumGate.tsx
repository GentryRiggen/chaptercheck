"use client";

import { Lock } from "lucide-react";
import { cloneElement, isValidElement, type ReactElement } from "react";

import { usePermissions } from "@/contexts/PermissionsContext";
import { cn } from "@/lib/utils";

interface PremiumGateProps {
  /** Content to wrap with premium gating */
  children: React.ReactNode;
  /** Whether to completely hide when lacking premium (default: false, shows disabled) */
  hideWhenLocked?: boolean;
  /** Custom message to show when lacking premium */
  lockedMessage?: string;
  /** Custom locked state renderer (for complex cases) */
  renderLocked?: () => React.ReactNode;
  /** Optional content to show while loading (default: null) */
  loading?: React.ReactNode;
}

/**
 * Wraps content with premium gating.
 * By default, shows content as disabled with an upgrade prompt (premium features should be visible but locked).
 * Use hideWhenLocked=true if you want to completely hide instead.
 *
 * Usage:
 * ```tsx
 * <PremiumGate>
 *   <AudioUpload bookId={bookId} />
 * </PremiumGate>
 * ```
 */
export function PremiumGate({
  children,
  hideWhenLocked = false,
  lockedMessage = "Upgrade to Premium",
  renderLocked,
  loading = null,
}: PremiumGateProps) {
  const { isLoading, hasPremium } = usePermissions();

  // Show loading fallback while permissions are being fetched
  if (isLoading) {
    return <>{loading}</>;
  }

  // User has premium - render children normally
  if (hasPremium) {
    return <>{children}</>;
  }

  // User lacks premium
  if (hideWhenLocked) {
    return null;
  }

  // Custom locked renderer
  if (renderLocked) {
    return <>{renderLocked()}</>;
  }

  // Default: show children disabled with lock overlay
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>{lockedMessage}</span>
        </div>
      </div>
    </div>
  );
}

interface PremiumButtonProps {
  /** The button element to wrap */
  children: ReactElement<{ disabled?: boolean; className?: string }>;
  /** Whether to hide instead of disable (default: false) */
  hideWhenLocked?: boolean;
}

/**
 * Wraps a button to disable it when user lacks premium.
 * Adds a lock icon and disables the button.
 *
 * Usage:
 * ```tsx
 * <PremiumButton>
 *   <Button onClick={handlePlay}>
 *     <Play /> Play
 *   </Button>
 * </PremiumButton>
 * ```
 */
export function PremiumButton({ children, hideWhenLocked = false }: PremiumButtonProps) {
  const { isLoading, hasPremium } = usePermissions();

  if (isLoading) {
    return null;
  }

  if (hasPremium) {
    return children;
  }

  if (hideWhenLocked) {
    return null;
  }

  // Clone the button with disabled state and lock icon
  if (isValidElement(children)) {
    return cloneElement(children, {
      disabled: true,
      className: cn(children.props.className, "cursor-not-allowed"),
    });
  }

  return children;
}
