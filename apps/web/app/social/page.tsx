"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Activity, Loader2, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ActivityItemCard } from "@/components/social/ActivityItemCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SocialPage() {
  return (
    <Suspense>
      <SocialPageContent />
    </Suspense>
  );
}

function SocialPageContent() {
  usePageTitle("Social");
  const { shouldSkipQuery, isAuthLoading } = useAuthReady();
  const { isSignedIn } = useAuth();

  if (!isSignedIn && !isAuthLoading) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-2xl px-3 py-12 text-center sm:px-6 lg:px-8">
          <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">Social</h1>
          <p className="mb-6 text-muted-foreground">
            Sign in to see what your friends are reading.
          </p>
          <Button asChild>
            <Link href="/sign-in">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-2xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">Social</h1>

        <Tabs defaultValue="following">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="following" className="flex-1">
              Following
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex-1">
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following">
            <FollowingFeed shouldSkipQuery={shouldSkipQuery} isAuthLoading={isAuthLoading} />
          </TabsContent>

          <TabsContent value="discover">
            <DiscoverFeed shouldSkipQuery={shouldSkipQuery} isAuthLoading={isAuthLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FollowingFeed({
  shouldSkipQuery,
  isAuthLoading,
}: {
  shouldSkipQuery: boolean;
  isAuthLoading: boolean;
}) {
  const activityFeed = useQuery(api.follows.queries.getActivityFeed, shouldSkipQuery ? "skip" : {});

  const isLoading = !shouldSkipQuery && activityFeed === undefined;

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activityFeed || activityFeed.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
        <UserPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="mb-1 font-medium text-foreground">No activity yet</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Follow people to see their reading activity here.
        </p>
        <Button variant="outline" asChild>
          <Link href="/people">Find People to Follow</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activityFeed.map((item) => (
        <ActivityItemCard key={item._id} item={item} />
      ))}
    </div>
  );
}

function DiscoverFeed({
  shouldSkipQuery,
  isAuthLoading,
}: {
  shouldSkipQuery: boolean;
  isAuthLoading: boolean;
}) {
  const communityActivity = useQuery(
    api.follows.queries.getCommunityActivity,
    shouldSkipQuery ? "skip" : {}
  );

  const isLoading = !shouldSkipQuery && communityActivity === undefined;

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!communityActivity || communityActivity.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="mb-1 font-medium text-foreground">No community activity yet</p>
        <p className="text-sm text-muted-foreground">
          Activity from public profiles across the community will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {communityActivity.map((item) => (
        <ActivityItemCard key={item._id} item={item} />
      ))}
    </div>
  );
}
