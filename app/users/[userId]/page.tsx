"use client";

import { useQuery } from "convex/react";
import { Book, Calendar, Lock, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LibraryBookCard } from "@/components/books/LibraryBookCard";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatRelativeDate } from "@/lib/utils";

export default function UserProfilePage({ params }: { params: Promise<{ userId: Id<"users"> }> }) {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    params.then((p) => setUserId(p.userId));
  }, [params]);

  const profile = useQuery(api.users.queries.getUserProfile, userId ? { userId } : "skip");

  // Skip fetching books if profile is private and not own profile
  const shouldSkipBooks = !userId || (profile?.isProfilePrivate === true && !profile?.isOwnProfile);
  const readBooks = useQuery(
    api.bookUserData.queries.getUserReadBooks,
    shouldSkipBooks ? "skip" : { userId }
  );

  const booksLoading = readBooks === undefined && !shouldSkipBooks;
  const noBooksRead = readBooks !== undefined && readBooks.length === 0;

  usePageTitle(profile?.name ? `${profile.name}'s Profile` : null);

  // Loading state
  if (profile === undefined || userId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // User not found
  if (profile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">User not found</p>
          <Link href="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const memberSince = formatRelativeDate(profile.createdAt);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
        {/* Back link */}
        <Link href="/" className="mb-4 inline-block text-sm text-primary hover:underline">
          &larr; Back to Home
        </Link>

        {/* Profile Header */}
        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <UserAvatar
            name={profile.name}
            imageUrl={profile.imageUrl}
            size="lg"
            className="!h-20 !w-20 !text-2xl sm:!h-24 sm:!w-24"
          />

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold sm:text-3xl">{profile.name || "Anonymous User"}</h1>

            {/* Stats row - only show if profile is public or own profile */}
            {profile.stats && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start sm:gap-6">
                <div className="flex items-center gap-1.5">
                  <Book className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground">{profile.stats.booksRead}</span>{" "}
                    books read
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground">
                      {profile.stats.reviewsWritten}
                    </span>{" "}
                    reviews
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {memberSince}</span>
                </div>
              </div>
            )}

            {/* Edit settings button for own profile */}
            {profile.isOwnProfile && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/account">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Profile Settings
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Private profile message */}
        {profile.isProfilePrivate && !profile.isOwnProfile && (
          <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
            <Lock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold">This profile is private</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.name || "This user"} has chosen to keep their reading activity private.
            </p>
          </div>
        )}

        {/* Books grid - only show if profile is public or own profile */}
        {(!profile.isProfilePrivate || profile.isOwnProfile) && (
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {profile.isOwnProfile ? "Your Library" : `${profile.name || "User"}'s Library`}
            </h2>

            {booksLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : noBooksRead ? (
              <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
                <Book className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {profile.isOwnProfile
                    ? "You haven't marked any books as read yet."
                    : "No books in this library yet."}
                </p>
                {profile.isOwnProfile && (
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/books">Browse Books</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {readBooks?.map((book) => (
                  <LibraryBookCard key={book._id} book={book} isOwnProfile={profile.isOwnProfile} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
