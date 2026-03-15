"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useQuery } from "convex/react";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { UserRow } from "@/components/social/UserRow";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function FollowersPage() {
  const params = useParams<{ userId: string }>();
  const userId = (params?.userId as Id<"users"> | undefined) ?? null;
  const { shouldSkipQuery } = useAuthReady();

  const profile = useQuery(
    api.users.queries.getUserProfile,
    shouldSkipQuery || !userId ? "skip" : { userId }
  );

  const followers = useQuery(
    api.follows.queries.getUserFollowers,
    shouldSkipQuery || !userId ? "skip" : { userId }
  );

  usePageTitle(profile?.name ? `${profile.name}'s Followers` : "Followers");

  if (followers === undefined || profile === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
      {/* Back link */}
      <Link
        href={`/users/${userId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {profile?.name ? `${profile.name}'s Profile` : "Back to Profile"}
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Followers</h1>

      {followers.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {profile?.isOwnProfile
              ? "You don't have any followers yet."
              : `${profile?.name || "This user"} doesn't have any followers yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {followers.map((user) => (
            <UserRow key={user._id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
