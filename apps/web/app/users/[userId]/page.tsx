"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useQuery } from "convex/react";
import {
  Book,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Lock,
  MessageSquare,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { LibraryBookCard } from "@/components/books/LibraryBookCard";
import { StarRating } from "@/components/books/StarRating";
import { ShelfCard } from "@/components/shelves/ShelfCard";
import { ShelfDialog } from "@/components/shelves/ShelfDialog";
import { FollowButton } from "@/components/social/FollowButton";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = (params?.userId as Id<"users"> | undefined) ?? null;

  const profile = useQuery(api.users.queries.getUserProfile, userId ? { userId } : "skip");

  // Skip fetching books if profile is private and not own profile
  const shouldSkipBooks = !userId || (profile?.isProfilePrivate === true && !profile?.isOwnProfile);
  const readBooks = useQuery(
    api.bookUserData.queries.getUserReadBooks,
    shouldSkipBooks ? "skip" : { userId }
  );

  const shouldSkipShelves =
    !userId || (profile?.isProfilePrivate === true && !profile?.isOwnProfile);
  const shelvesData = useQuery(
    api.shelves.queries.getUserShelves,
    shouldSkipShelves ? "skip" : { userId }
  );

  const shouldSkipReviews =
    !userId || (profile?.isProfilePrivate === true && !profile?.isOwnProfile);
  const reviews = useQuery(
    api.bookUserData.queries.getUserPublicReviews,
    shouldSkipReviews ? "skip" : { userId }
  );

  const [createShelfOpen, setCreateShelfOpen] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

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
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h1 className="text-2xl font-bold sm:text-3xl">{profile.name || "Anonymous User"}</h1>
              {!profile.isOwnProfile && userId && <FollowButton targetUserId={userId} />}
            </div>

            {/* Follower / Following counts */}
            <div className="mt-3 flex items-center justify-center gap-4 text-sm sm:justify-start sm:gap-6">
              <Link
                href={`/users/${userId}/followers`}
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                <span>
                  <span className="font-medium text-foreground">{profile.followersCount}</span>{" "}
                  {profile.followersCount === 1 ? "follower" : "followers"}
                </span>
              </Link>
              <Link
                href={`/users/${userId}/following`}
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>
                  <span className="font-medium text-foreground">{profile.followingCount}</span>{" "}
                  following
                </span>
              </Link>
            </div>

            {/* Stats row - only show if profile is public or own profile */}
            {profile.stats && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start sm:gap-6">
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
                  <BookOpen className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground">
                      {profile.stats.shelvesCount}
                    </span>{" "}
                    {profile.stats.shelvesCount === 1 ? "shelf" : "shelves"}
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

        {/* Shelves section - only show if profile is public or own profile */}
        {(!profile.isProfilePrivate || profile.isOwnProfile) && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Shelves
              </h2>
              {profile.isOwnProfile && (
                <Button variant="outline" size="sm" onClick={() => setCreateShelfOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shelf
                </Button>
              )}
            </div>

            {shelvesData === undefined ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : shelvesData.shelves.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {profile.isOwnProfile
                    ? "Create your first shelf to curate book lists."
                    : "No shelves yet."}
                </p>
                {profile.isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setCreateShelfOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first shelf
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {shelvesData.shelves.map((shelf) => (
                  <ShelfCard key={shelf._id} shelf={shelf} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews section - only show if profile is public or own profile */}
        {(!profile.isProfilePrivate || profile.isOwnProfile) && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Reviews
            </h2>

            {reviews === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
                <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {profile.isOwnProfile
                    ? "You haven't reviewed any books yet."
                    : `${profile.name || "This user"} hasn't written any reviews.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const isExpanded = expandedReviews.has(review._id);
                  const hasLongText = (review.reviewText?.length ?? 0) > 200;

                  return (
                    <div
                      key={review._id}
                      className="rounded-lg border border-border/50 bg-card/50 p-4"
                    >
                      <div className="flex gap-3">
                        {/* Book cover */}
                        {review.book && (
                          <Link href={`/books/${review.book._id}`} className="shrink-0">
                            <BookCover
                              coverImageR2Key={review.book.coverImageR2Key}
                              title={review.book.title}
                              size="sm"
                            />
                          </Link>
                        )}

                        {/* Review content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {review.book && (
                                <Link
                                  href={`/books/${review.book._id}`}
                                  className="line-clamp-1 font-medium hover:underline"
                                >
                                  {review.book.title}
                                </Link>
                              )}
                              {review.book && review.book.authors.length > 0 && (
                                <p className="line-clamp-1 text-sm text-muted-foreground">
                                  {review.book.authors.map((a) => a.name).join(", ")}
                                </p>
                              )}
                            </div>

                            {/* Private badge for own private reviews */}
                            {profile.isOwnProfile && review.isReviewPrivate && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                                <EyeOff className="h-3 w-3" />
                                Private
                              </span>
                            )}
                          </div>

                          {/* Rating + date row */}
                          <div className="mt-1 flex items-center gap-3">
                            {review.rating !== undefined && (
                              <StarRating value={review.rating} readonly size="xs" />
                            )}
                            {review.reviewedAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeDate(review.reviewedAt)}
                              </span>
                            )}
                          </div>

                          {/* Review text */}
                          {review.reviewText && (
                            <div className="mt-2">
                              <p
                                className={
                                  isExpanded
                                    ? "whitespace-pre-wrap text-sm"
                                    : "line-clamp-3 whitespace-pre-wrap text-sm"
                                }
                              >
                                {review.reviewText}
                              </p>
                              {hasLongText && (
                                <button
                                  onClick={() => {
                                    setExpandedReviews((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(review._id)) {
                                        next.delete(review._id);
                                      } else {
                                        next.add(review._id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show less <ChevronUp className="h-3 w-3" />
                                    </>
                                  ) : (
                                    <>
                                      Show more <ChevronDown className="h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {profile.isOwnProfile && (
        <ShelfDialog open={createShelfOpen} onOpenChange={setCreateShelfOpen} />
      )}
    </div>
  );
}
