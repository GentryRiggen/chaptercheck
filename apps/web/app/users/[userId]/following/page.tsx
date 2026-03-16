"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { useQuery } from "convex/react";
import { ArrowLeft, Search, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { UserRow } from "@/components/social/UserRow";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function FollowingPage() {
  const params = useParams<{ userId: string }>();
  const userId = (params?.userId as Id<"users"> | undefined) ?? null;
  const { shouldSkipQuery } = useAuthReady();

  const profile = useQuery(
    api.users.queries.getUserProfile,
    shouldSkipQuery || !userId ? "skip" : { userId }
  );

  const following = useQuery(
    api.follows.queries.getUserFollowing,
    shouldSkipQuery || !userId ? "skip" : { userId }
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filteredFollowing = useMemo(() => {
    if (!following) return [];
    if (!debouncedSearch) return following;
    const q = debouncedSearch.toLowerCase();
    return following.filter((user) => user.name?.toLowerCase().includes(q));
  }, [following, debouncedSearch]);

  usePageTitle(profile?.name ? `${profile.name}'s Following` : "Following");

  if (following === undefined || profile === undefined) {
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

      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Following</h1>
        {following.length > 0 && (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search following..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        )}
      </div>

      {following.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {profile?.isOwnProfile
              ? "You're not following anyone yet."
              : `${profile?.name || "This user"} isn't following anyone yet.`}
          </p>
        </div>
      ) : filteredFollowing.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
          <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No users matching &quot;{debouncedSearch}&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFollowing.map((user) => (
            <UserRow key={user._id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
