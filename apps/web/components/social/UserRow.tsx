"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import Link from "next/link";

import { UserAvatar } from "@/components/ui/user-avatar";

import { FollowButton } from "./FollowButton";

interface UserRowProps {
  user: {
    _id: Id<"users">;
    name?: string;
    imageUrl?: string;
  };
}

export function UserRow({ user }: UserRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-card/80 sm:p-4">
      <Link href={`/users/${user._id}`} className="shrink-0">
        <UserAvatar name={user.name} imageUrl={user.imageUrl} size="lg" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/users/${user._id}`} className="font-medium hover:underline">
          {user.name || "Anonymous User"}
        </Link>
      </div>

      <FollowButton targetUserId={user._id} compact />
    </div>
  );
}
