"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatBytes, formatRelativeDate } from "@chaptercheck/shared/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Calendar,
  Clock3,
  Crown,
  HardDrive,
  Headphones,
  Loader2,
  Lock,
  MessageSquare,
  ShieldOff,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { SuspendUserDialog } from "@/components/admin/SuspendUserDialog";
import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/books/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePermissions } from "@/contexts/PermissionsContext";
import { usePageTitle } from "@/hooks/usePageTitle";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatEntryDate(timestamp?: number) {
  return timestamp ? formatRelativeDate(timestamp) : "Unknown";
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = (params?.userId as Id<"users"> | undefined) ?? null;

  const userDetail = useQuery(api.users.queries.getAdminUserDetail, userId ? { userId } : "skip");
  const listeningActivity = useQuery(
    api.listeningProgress.queries.getAdminUserListeningActivity,
    userId ? { userId, limit: 20 } : "skip"
  );
  const ratings = useQuery(
    api.bookUserData.queries.getAdminUserRatings,
    userId ? { userId } : "skip"
  );

  const { user: currentUser } = usePermissions();
  const unsuspendUser = useMutation(api.users.mutations.unsuspendUser);

  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUnsuspending, setIsUnsuspending] = useState(false);

  usePageTitle(userDetail?.name ? `${userDetail.name} Admin View` : "Admin User");

  if (
    userId &&
    (userDetail === undefined || listeningActivity === undefined || ratings === undefined)
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userId === null || userDetail == null || listeningActivity == null || ratings == null) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <UserRound className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-lg font-semibold">User not found</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  const isOwnAccount = currentUser?._id === userDetail._id;
  const isSuspended = userDetail.approvalStatus === "suspended";
  const isPending = userDetail.approvalStatus === "pending";
  const isAdmin = userDetail.role === "admin";
  const showSuspendButton = !isOwnAccount && !isPending && !isSuspended;
  const showUnsuspendButton = !isOwnAccount && isSuspended;
  const showDeleteButton = !isOwnAccount && !isAdmin;

  const handleUnsuspend = async () => {
    setIsUnsuspending(true);
    try {
      await unsuspendUser({ userId: userDetail._id });
      toast.success(`Unsuspended ${userDetail.name || userDetail.email}`);
    } catch {
      toast.error("Couldn't unsuspend the user. Please try again.");
    } finally {
      setIsUnsuspending(false);
    }
  };

  const currentListening = listeningActivity.current;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
        </Button>

        <div className="rounded-2xl border bg-card/60 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <UserAvatar
                name={userDetail.name}
                imageUrl={userDetail.imageUrl}
                size="lg"
                className="!h-20 !w-20 !text-2xl"
              />
              <div className="min-w-0 space-y-2">
                <div>
                  <h1 className="text-2xl font-bold">{userDetail.name || "Unnamed user"}</h1>
                  <p className="text-sm text-muted-foreground">{userDetail.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      userDetail.role === "admin"
                        ? "default"
                        : userDetail.role === "editor"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {userDetail.role}
                  </Badge>
                  {userDetail.hasPremium && (
                    <Badge variant="secondary">
                      <Crown className="mr-1 h-3 w-3 text-yellow-500" />
                      Premium
                    </Badge>
                  )}
                  {userDetail.isProfilePrivate && (
                    <Badge variant="outline">
                      <Lock className="mr-1 h-3 w-3" />
                      Private profile
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Joined {formatRelativeDate(userDetail.createdAt)}
                  </span>
                  {userDetail.storageAccount && (
                    <span className="inline-flex items-center gap-1.5">
                      <HardDrive className="h-4 w-4" />
                      {formatBytes(userDetail.storageAccount.totalBytesUsed)} across{" "}
                      {userDetail.storageAccount.fileCount} files
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(showSuspendButton || showUnsuspendButton || showDeleteButton) && (
              <div className="flex shrink-0 gap-2">
                {showSuspendButton && (
                  <Button variant="outline" size="sm" onClick={() => setIsSuspendOpen(true)}>
                    <Ban className="mr-1.5 h-4 w-4" />
                    Suspend
                  </Button>
                )}
                {showUnsuspendButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnsuspend}
                    disabled={isUnsuspending}
                  >
                    <ShieldOff className="mr-1.5 h-4 w-4" />
                    {isUnsuspending ? "Unsuspending..." : "Unsuspend"}
                  </Button>
                )}
                {showDeleteButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {isSuspended && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  This user is suspended
                </span>
              </div>
              {userDetail.suspensionReason && (
                <p className="mt-1 pl-6 text-sm text-amber-700 dark:text-amber-400">
                  Reason: {userDetail.suspensionReason}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                Books read
              </div>
              <div className="mt-2 text-2xl font-semibold">{userDetail.stats.booksRead}</div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Ratings & reviews
              </div>
              <div className="mt-2 text-2xl font-semibold">{userDetail.stats.reviewsWritten}</div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Headphones className="h-4 w-4" />
                Listening entries
              </div>
              <div className="mt-2 text-2xl font-semibold">{userDetail.stats.listeningBooks}</div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                Shelves
              </div>
              <div className="mt-2 text-2xl font-semibold">{userDetail.stats.shelvesCount}</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="listening" className="mt-6 w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="listening">Listening</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
          </TabsList>

          <TabsContent value="listening" className="mt-4 space-y-6">
            <section className="rounded-2xl border bg-card/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Headphones className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Current listening</h2>
              </div>

              {!currentListening ? (
                <p className="text-sm text-muted-foreground">No listening progress saved yet.</p>
              ) : (
                <div className="rounded-xl border bg-background/70 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Link href={`/books/${currentListening.bookId}`} className="shrink-0">
                      <BookCover
                        coverImageR2Key={currentListening.book.coverImageR2Key}
                        title={currentListening.book.title}
                        size="md"
                      />
                    </Link>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <Link
                          href={`/books/${currentListening.bookId}`}
                          className="text-lg font-semibold hover:text-primary"
                        >
                          {currentListening.book.title}
                        </Link>
                        {currentListening.book.authors.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {currentListening.book.authors.map((author) => author.name).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{currentListening.audioFile.displayName}</Badge>
                        {currentListening.totalParts > 1 &&
                          currentListening.audioFile.partNumber && (
                            <Badge variant="outline">
                              Part {currentListening.audioFile.partNumber}
                            </Badge>
                          )}
                        <Badge variant="secondary">
                          {formatPercent(currentListening.progressFraction)}
                        </Badge>
                        <Badge variant="secondary">{currentListening.playbackRate}x</Badge>
                        {currentListening.userBookData?.status && (
                          <Badge variant="outline">{currentListening.userBookData.status}</Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Progress value={currentListening.progressFraction * 100} />
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4" />
                            {formatTime(currentListening.positionSeconds)}
                            {currentListening.effectiveDuration > 0 &&
                              ` of ${formatTime(currentListening.effectiveDuration)}`}
                          </span>
                          <span>
                            Last synced {formatRelativeDate(currentListening.lastListenedAt)}
                          </span>
                        </div>
                      </div>

                      {currentListening.userBookData?.rating !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rating</span>
                          <StarRating
                            value={currentListening.userBookData.rating}
                            readonly
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-card/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Listening history</h2>
              </div>

              {listeningActivity.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No listening history yet.</p>
              ) : (
                <div className="space-y-3">
                  {listeningActivity.history.map((entry) => (
                    <div key={entry._id} className="rounded-xl border bg-background/70 p-4">
                      <div className="flex gap-3">
                        <Link href={`/books/${entry.bookId}`} className="shrink-0">
                          <BookCover
                            coverImageR2Key={entry.book.coverImageR2Key}
                            title={entry.book.title}
                            size="sm"
                          />
                        </Link>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <Link
                                href={`/books/${entry.bookId}`}
                                className="line-clamp-1 font-medium hover:text-primary"
                              >
                                {entry.book.title}
                              </Link>
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {entry.book.authors.map((author) => author.name).join(", ") ||
                                  "Unknown author"}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatRelativeDate(entry.lastListenedAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">{entry.audioFile.displayName}</Badge>
                            {entry.totalParts > 1 && entry.audioFile.partNumber && (
                              <Badge variant="outline">Part {entry.audioFile.partNumber}</Badge>
                            )}
                            <Badge variant="secondary">{entry.playbackRate}x</Badge>
                            {entry.userBookData?.status && (
                              <Badge variant="outline">{entry.userBookData.status}</Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Progress value={entry.progressFraction * 100} />
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                {formatTime(entry.positionSeconds)}
                                {entry.effectiveDuration > 0 &&
                                  ` / ${formatTime(entry.effectiveDuration)}`}
                              </span>
                              <span>{formatPercent(entry.progressFraction)} complete</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="ratings" className="mt-4">
            <section className="rounded-2xl border bg-card/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Ratings & reviews</h2>
              </div>

              {ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ratings or reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {ratings.map((entry) => (
                    <div key={entry._id} className="rounded-xl border bg-background/70 p-4">
                      <div className="flex gap-3">
                        <Link href={`/books/${entry.book._id}`} className="shrink-0">
                          <BookCover
                            coverImageR2Key={entry.book.coverImageR2Key}
                            title={entry.book.title}
                            size="sm"
                          />
                        </Link>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <Link
                                href={`/books/${entry.book._id}`}
                                className="line-clamp-1 font-medium hover:text-primary"
                              >
                                {entry.book.title}
                              </Link>
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {entry.book.authors.map((author) => author.name).join(", ") ||
                                  "Unknown author"}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatEntryDate(entry.reviewedAt ?? entry.readAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {entry.rating !== undefined && (
                              <StarRating value={entry.rating} readonly size="sm" />
                            )}
                            {entry.isRead && <Badge variant="outline">Read</Badge>}
                            {entry.isReadPrivate && <Badge variant="outline">Read private</Badge>}
                            {entry.isReviewPrivate && (
                              <Badge variant="outline">Review private</Badge>
                            )}
                          </div>

                          {entry.reviewText && (
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                              {entry.reviewText}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>

      <SuspendUserDialog user={userDetail} open={isSuspendOpen} onOpenChange={setIsSuspendOpen} />
      <DeleteUserDialog
        user={userDetail}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        redirectOnDelete
      />
    </div>
  );
}
