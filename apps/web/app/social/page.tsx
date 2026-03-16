"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Activity,
  BookmarkPlus,
  Loader2,
  LogIn,
  MessageSquareText,
  Search,
  Star,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";

import { type ActivityItem, ActivityItemCard } from "@/components/social/ActivityItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";

type ActivityType = "all" | "review" | "shelf_add" | "public_note";

const ACTIVITY_TYPE_FILTERS: { value: ActivityType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Activity },
  { value: "review", label: "Reviews", icon: Star },
  { value: "shelf_add", label: "Shelf Adds", icon: BookmarkPlus },
  { value: "public_note", label: "Notes", icon: MessageSquareText },
];

function useFilteredActivity(
  items: ActivityItem[] | undefined,
  searchQuery: string,
  typeFilter: ActivityType
): ActivityItem[] | undefined {
  const debouncedSearch = useDebounce(searchQuery, 300);

  return useMemo(() => {
    if (!items) return undefined;

    let filtered = items;

    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    const trimmed = debouncedSearch.trim().toLowerCase();
    if (trimmed) {
      filtered = filtered.filter(
        (item) =>
          item.book.title.toLowerCase().includes(trimmed) ||
          (item.user.name && item.user.name.toLowerCase().includes(trimmed)) ||
          (item.reviewText && item.reviewText.toLowerCase().includes(trimmed)) ||
          (item.noteText && item.noteText.toLowerCase().includes(trimmed)) ||
          (item.shelfName && item.shelfName.toLowerCase().includes(trimmed))
      );
    }

    return filtered;
  }, [items, debouncedSearch, typeFilter]);
}

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
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType>("all");

  const hasActiveFilters = searchInput.trim().length > 0 || typeFilter !== "all";

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

        {/* Search and filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by book, person, or content..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {ACTIVITY_TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setTypeFilter("all");
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-card/80 hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>

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
            <FollowingFeed
              shouldSkipQuery={shouldSkipQuery}
              isAuthLoading={isAuthLoading}
              searchQuery={searchInput}
              typeFilter={typeFilter}
            />
          </TabsContent>

          <TabsContent value="discover">
            <DiscoverFeed
              shouldSkipQuery={shouldSkipQuery}
              isAuthLoading={isAuthLoading}
              searchQuery={searchInput}
              typeFilter={typeFilter}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface FeedProps {
  shouldSkipQuery: boolean;
  isAuthLoading: boolean;
  searchQuery: string;
  typeFilter: ActivityType;
}

function FollowingFeed({ shouldSkipQuery, isAuthLoading, searchQuery, typeFilter }: FeedProps) {
  const activityResult = useQuery(
    api.follows.queries.getActivityFeed,
    shouldSkipQuery ? "skip" : {}
  );
  const activityFeed = activityResult?.items;
  const filteredFeed = useFilteredActivity(activityFeed, searchQuery, typeFilter);

  const isLoading = !shouldSkipQuery && activityResult === undefined;

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

  if (filteredFeed && filteredFeed.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
        <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="mb-1 font-medium text-foreground">No matching activity</p>
        <p className="text-sm text-muted-foreground">Try a different search term or filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredFeed?.map((item) => (
        <ActivityItemCard key={item._id} item={item} />
      ))}
    </div>
  );
}

function DiscoverFeed({ shouldSkipQuery, isAuthLoading, searchQuery, typeFilter }: FeedProps) {
  const communityResult = useQuery(
    api.follows.queries.getCommunityActivity,
    shouldSkipQuery ? "skip" : {}
  );
  const communityActivity = communityResult?.items;
  const filteredFeed = useFilteredActivity(communityActivity, searchQuery, typeFilter);

  const isLoading = !shouldSkipQuery && communityResult === undefined;

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

  if (filteredFeed && filteredFeed.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
        <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="mb-1 font-medium text-foreground">No matching activity</p>
        <p className="text-sm text-muted-foreground">Try a different search term or filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredFeed?.map((item) => (
        <ActivityItemCard key={item._id} item={item} />
      ))}
    </div>
  );
}
