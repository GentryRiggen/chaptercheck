"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useMutation, useQuery } from "convex/react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApprovalGate } from "@/components/permissions/ApprovalGate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: Id<"users">;
  /** When true, renders a smaller button suitable for list rows */
  compact?: boolean;
  className?: string;
}

export function FollowButton({ targetUserId, compact = false, className }: FollowButtonProps) {
  const { shouldSkipQuery } = useAuthReady();
  const currentUser = useQuery(
    api.users.queries.getCurrentUserWithPermissions,
    shouldSkipQuery ? "skip" : {}
  );

  const followStatus = useQuery(
    api.follows.queries.getFollowStatus,
    shouldSkipQuery ? "skip" : { userId: targetUserId }
  );

  const followUser = useMutation(api.follows.mutations.followUser);
  const unfollowUser = useMutation(api.follows.mutations.unfollowUser);

  const [isOptimistic, setIsOptimistic] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Don't render if not authenticated or viewing own profile
  if (shouldSkipQuery || !currentUser || currentUser._id === targetUserId) {
    return null;
  }

  // Still loading follow status
  if (followStatus === undefined) {
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled
        className={cn("min-w-[100px]", className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="sr-only">Loading follow status</span>
      </Button>
    );
  }

  const isFollowing = isOptimistic !== null ? isOptimistic : followStatus.isFollowing;

  const handleToggle = async () => {
    if (isPending) return;

    setIsPending(true);
    setIsOptimistic(!isFollowing);

    try {
      if (isFollowing) {
        await unfollowUser({ userId: targetUserId });
      } else {
        await followUser({ userId: targetUserId });
      }
    } catch {
      // Revert optimistic update on error
      setIsOptimistic(null);
      toast.error("Couldn't update. Please try again.");
    } finally {
      setIsOptimistic(null);
      setIsPending(false);
    }
  };

  return (
    <ApprovalGate>
      <Button
        variant={isFollowing ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "min-w-[100px] transition-all",
          isFollowing && "hover:border-destructive hover:bg-destructive/10 hover:text-destructive",
          className
        )}
      >
        {isFollowing ? (
          <>
            <UserCheck className="mr-1.5 h-4 w-4" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Follow
          </>
        )}
      </Button>
    </ApprovalGate>
  );
}
