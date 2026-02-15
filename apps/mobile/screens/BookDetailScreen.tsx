import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { type ReviewSortOption } from "@chaptercheck/convex-backend/bookUserData/queries";
import { formatBytes, formatRelativeDate } from "@chaptercheck/shared/utils";
import { useUser } from "@clerk/clerk-expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownToLine,
  ArrowUpDown,
  CheckCircle,
  MessageSquarePlus,
  Pause,
  Pencil,
  Play,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useQuery } from "convex/react";

import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { BookDetailSkeleton } from "@/components/skeletons/BookDetailSkeleton";
import { useThemeColors } from "@/hooks/useThemeColors";
import { BookCover } from "@/components/books/BookCover";
import { BookReadStatus } from "@/components/books/BookReadStatus";
import { BookReviewDialog } from "@/components/books/BookReviewDialog";
import { StarRating } from "@/components/books/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 10;

const SORT_OPTIONS: SelectOption[] = [
  { label: "Most recent", value: "recent" },
  { label: "Oldest first", value: "oldest" },
  { label: "Highest rated", value: "highest" },
  { label: "Lowest rated", value: "lowest" },
];

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export default function BookDetailScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const id = bookId as Id<"books">;

  const book = useQuery(api.books.queries.getBook, id ? { bookId: id } : "skip");
  const audioFiles = useQuery(
    api.audioFiles.queries.getAudioFilesForBook,
    id ? { bookId: id } : "skip"
  );
  const myBookData = useQuery(api.bookUserData.queries.getMyBookData, id ? { bookId: id } : "skip");
  const genres = useQuery(
    api.bookGenreVotes.queries.getGenresForBook,
    id ? { bookId: id } : "skip"
  );

  const [activeTab, setActiveTab] = useState("audio");

  // Loading state
  if (book === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Book" }} />
        <BookDetailSkeleton />
      </>
    );
  }

  // Not found state
  if (book === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text className="text-center text-muted-foreground">Book not found</Text>
      </View>
    );
  }

  const hasRating =
    book.averageRating !== undefined && book.ratingCount !== undefined && book.ratingCount > 0;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-12">
      <Stack.Screen options={{ title: book.title }} />

      {/* Hero Section */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {/* Cover + Title row */}
        <View className="flex-row" style={{ gap: 16 }}>
          <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="lg" />

          <View className="min-w-0 flex-1 justify-center" style={{ gap: 4 }}>
            {/* Series link */}
            {book.series && (
              <Pressable
                onPress={() => router.push(`/series/${book.series!._id}`)}
                accessibilityRole="link"
              >
                <Text className="text-sm italic text-primary" numberOfLines={1}>
                  {book.series.name}
                  {book.seriesOrder !== undefined && ` #${book.seriesOrder}`}
                </Text>
              </Pressable>
            )}

            <Text className="text-xl font-bold leading-tight text-foreground">{book.title}</Text>

            {book.subtitle && (
              <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={2}>
                {book.subtitle}
              </Text>
            )}

            {/* Authors */}
            {book.authors.length > 0 && (
              <View className="flex-row flex-wrap items-center" style={{ gap: 2 }}>
                <Text className="text-sm text-muted-foreground">by </Text>
                {book.authors.map((author, index) => (
                  <View key={author._id} className="flex-row items-center">
                    <Pressable
                      onPress={() => router.push(`/authors/${author._id}`)}
                      accessibilityRole="link"
                    >
                      <Text className="text-sm text-primary">{author.name}</Text>
                    </Pressable>
                    {author.role && author.role !== "author" && (
                      <Text className="text-xs text-muted-foreground"> ({author.role})</Text>
                    )}
                    {index < book.authors.length - 1 && (
                      <Text className="text-sm text-muted-foreground">, </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Genres */}
            {genres && genres.length > 0 && (
              <View className="flex-row flex-wrap" style={{ gap: 6, paddingTop: 4 }}>
                {genres.map((genre) => (
                  <Badge key={genre._id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </View>
            )}

            {/* Year · Language · Rating */}
            <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
              {book.publishedYear && (
                <Text className="text-xs text-muted-foreground">{book.publishedYear}</Text>
              )}
              {book.language && (
                <Text className="text-xs text-muted-foreground">{book.language.toUpperCase()}</Text>
              )}
              {hasRating && (
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <StarRating value={Math.round(book.averageRating!)} readonly size="sm" />
                  <Text className="text-xs text-muted-foreground">({book.ratingCount})</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Read Status */}
        <View style={{ paddingTop: 14 }}>
          <BookReadStatus bookId={id} myBookData={myBookData} />
        </View>
      </View>

      {/* Description Section */}
      {book.description && (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 8 }}>
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </Text>
          <Text className="text-sm leading-relaxed text-foreground">{book.description}</Text>
        </View>
      )}

      {/* Tabbed Section */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="audio">
            <AudioTab
              audioFiles={audioFiles}
              bookId={id}
              bookTitle={book.title}
              coverImageR2Key={book.coverImageR2Key}
              seriesName={book.series?.name}
              seriesOrder={book.seriesOrder}
            />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsTab bookId={id} myBookData={myBookData} />
          </TabsContent>
        </Tabs>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Reviews Tab
// ---------------------------------------------------------------------------

interface ReviewsTabProps {
  bookId: Id<"books">;
  myBookData:
    | {
        _id: Id<"bookUserData">;
        rating?: number;
        reviewText?: string;
        reviewedAt?: number;
        isReadPrivate?: boolean;
        isReviewPrivate: boolean;
        userId: Id<"users">;
      }
    | null
    | undefined;
}

function ReviewsTab({ bookId, myBookData }: ReviewsTabProps) {
  const colors = useThemeColors();
  const { user } = useUser();
  const [sortBy, setSortBy] = useState<ReviewSortOption>("recent");
  const [cursor, setCursor] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [accumulatedReviews, setAccumulatedReviews] = useState<
    Array<{
      _id: Id<"bookUserData">;
      rating?: number;
      reviewText?: string;
      reviewedAt?: number;
      isOwnReview: boolean;
      user: { _id: Id<"users">; name?: string; imageUrl?: string } | null;
    }>
  >([]);

  const reviewsResult = useQuery(api.bookUserData.queries.getPublicReviewsForBookPaginated, {
    bookId,
    paginationOpts: { numItems: PAGE_SIZE, cursor: cursor ?? null },
    sortBy,
  });

  // Track user's reviewedAt to detect deletion
  const prevReviewedAt = useRef(myBookData?.reviewedAt);

  useEffect(() => {
    const currentReviewedAt = myBookData?.reviewedAt;
    if (prevReviewedAt.current !== undefined && currentReviewedAt === undefined) {
      setCursor(null);
      setAccumulatedReviews([]);
    }
    prevReviewedAt.current = currentReviewedAt;
  }, [myBookData?.reviewedAt]);

  // Set initial reviews when first page arrives
  const isInitialLoad = cursor === null && reviewsResult !== undefined;
  if (isInitialLoad && accumulatedReviews.length === 0 && reviewsResult.page.length > 0) {
    setAccumulatedReviews(reviewsResult.page);
  }

  const handleLoadMore = useCallback(() => {
    if (reviewsResult?.continueCursor) {
      setAccumulatedReviews((prev) => {
        const existingIds = new Set(prev.map((r) => r._id));
        const newReviews = reviewsResult.page.filter((r) => !existingIds.has(r._id));
        return [...prev, ...newReviews];
      });
      setCursor(reviewsResult.continueCursor);
    }
  }, [reviewsResult]);

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as ReviewSortOption);
    setCursor(null);
    setAccumulatedReviews([]);
  }, []);

  const isInitialLoading = reviewsResult === undefined && accumulatedReviews.length === 0;
  const isLoadingMore = reviewsResult === undefined && accumulatedReviews.length > 0;
  const hasMore = reviewsResult ? !reviewsResult.isDone : false;

  // Combine accumulated reviews with current page
  const displayReviews =
    cursor !== null && reviewsResult
      ? (() => {
          const existingIds = new Set(accumulatedReviews.map((r) => r._id));
          const newReviews = reviewsResult.page.filter((r) => !existingIds.has(r._id));
          return [...accumulatedReviews, ...newReviews];
        })()
      : accumulatedReviews.length > 0
        ? accumulatedReviews
        : (reviewsResult?.page ?? []);

  const hasOwnReview =
    myBookData?.rating !== undefined ||
    (myBookData?.reviewText && myBookData.reviewText.length > 0);

  const communityReviews = displayReviews.filter((r) => !r.isOwnReview);

  return (
    <View style={{ gap: 16, paddingTop: 8 }}>
      {/* Write a Review button */}
      {!hasOwnReview && (
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            setEditingReview(false);
            setReviewDialogOpen(true);
          }}
        >
          <View className="flex-row items-center gap-1.5">
            <MessageSquarePlus size={14} className="text-foreground" />
            <Text className="text-xs font-medium text-foreground">Write a Review</Text>
          </View>
        </Button>
      )}

      {/* Loading state */}
      {isInitialLoading && (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Empty state */}
      {!isInitialLoading && displayReviews.length === 0 && !hasOwnReview && (
        <View className="rounded-lg border border-dashed border-border py-8">
          <Text className="text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to review!
          </Text>
        </View>
      )}

      {/* Own review pinned at top */}
      {hasOwnReview && myBookData && (
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your Review
            </Text>
            <Pressable
              onPress={() => {
                setEditingReview(true);
                setReviewDialogOpen(true);
              }}
              hitSlop={8}
              className="active:opacity-70"
              accessibilityLabel="Edit your review"
              accessibilityRole="button"
            >
              <Pencil size={14} color={colors.primary} />
            </Pressable>
          </View>
          <ReviewItem
            userName={
              user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "You" : "You"
            }
            userImageUrl={user?.imageUrl}
            rating={myBookData.rating}
            reviewText={myBookData.reviewText}
            reviewedAt={myBookData.reviewedAt}
            isPrivate={myBookData.isReviewPrivate}
          />
        </View>
      )}

      {/* Community reviews */}
      {communityReviews.length > 0 && (
        <View style={{ gap: 12 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {hasOwnReview ? "Community Reviews" : "Reviews"}
            </Text>
            <Select
              value={sortBy}
              onValueChange={handleSortChange}
              options={SORT_OPTIONS}
              className="w-36"
              icon={<ArrowUpDown size={14} className="ml-2 text-muted-foreground" />}
            />
          </View>
          {communityReviews.map((review) => (
            <ReviewItem
              key={review._id}
              userName={review.user?.name}
              userImageUrl={review.user?.imageUrl}
              rating={review.rating}
              reviewText={review.reviewText}
              reviewedAt={review.reviewedAt}
            />
          ))}
        </View>
      )}

      {/* Load More */}
      {(hasMore || isLoadingMore) && (
        <Button variant="outline" onPress={handleLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? "Loading..." : "Load More"}
        </Button>
      )}

      {/* Review Dialog */}
      <BookReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        bookId={bookId}
        initialData={
          editingReview && myBookData
            ? {
                rating: myBookData.rating,
                reviewText: myBookData.reviewText,
                isReadPrivate: myBookData.isReadPrivate,
                isReviewPrivate: myBookData.isReviewPrivate,
              }
            : undefined
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Review Item
// ---------------------------------------------------------------------------

interface ReviewItemProps {
  userName?: string;
  userImageUrl?: string;
  rating?: number;
  reviewText?: string;
  reviewedAt?: number;
  isPrivate?: boolean;
}

function ReviewItem({ userName, rating, reviewText, reviewedAt, isPrivate }: ReviewItemProps) {
  const displayName = userName || "Anonymous";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View className="gap-2 rounded-lg border border-border bg-card p-3">
      <View className="flex-row items-center gap-2.5">
        {/* Avatar circle */}
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/20">
          <Text className="text-sm font-semibold text-primary">{initial}</Text>
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
              {displayName}
            </Text>
            {isPrivate && (
              <Badge variant="outline" className="py-0">
                Private
              </Badge>
            )}
          </View>
          {reviewedAt && (
            <Text className="text-xs text-muted-foreground">{formatRelativeDate(reviewedAt)}</Text>
          )}
        </View>

        {/* Star rating */}
        {rating !== undefined && <StarRating value={rating} readonly size="xs" />}
      </View>

      {/* Review text */}
      {reviewText && <Text className="text-sm leading-relaxed text-foreground">{reviewText}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Audio Tab
// ---------------------------------------------------------------------------

interface AudioTabProps {
  audioFiles:
    | Array<{
        _id: Id<"audioFiles">;
        fileName: string;
        fileSize: number;
        displayName: string | null;
        partNumber?: number;
        format: string;
      }>
    | undefined;
  bookId: Id<"books">;
  bookTitle: string;
  coverImageR2Key?: string;
  seriesName?: string;
  seriesOrder?: number;
}

function DownloadProgressRing({
  progress,
  size = 28,
  strokeWidth = 2.5,
  color,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={0.2}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
      />
    </Svg>
  );
}

function AudioTab({
  audioFiles,
  bookId: bookIdProp,
  bookTitle,
  coverImageR2Key,
  seriesName,
  seriesOrder,
}: AudioTabProps) {
  const colors = useThemeColors();
  const { currentTrack, isPlaying, isLoading, play, togglePlayPause } = useAudioPlayerContext();
  const {
    downloadFile,
    downloadAllForBook,
    cancelDownload,
    deleteDownload,
    deleteDownloadsForBook,
    isDownloaded,
    getDownloadProgress,
  } = useDownloadManager();

  const savedProgress = useQuery(api.listeningProgress.queries.getProgressForBook, {
    bookId: bookIdProp,
  });

  if (audioFiles === undefined) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (audioFiles.length === 0) {
    return (
      <View className="rounded-lg border border-dashed border-border py-8">
        <Text className="text-center text-sm text-muted-foreground">
          No audio files uploaded yet
        </Text>
      </View>
    );
  }

  const totalParts = audioFiles.length;

  // Download state
  const allDownloaded = audioFiles.every((f) => isDownloaded(f._id));
  const someDownloaded = audioFiles.some((f) => isDownloaded(f._id));

  // Find the file matching saved progress
  const savedFile = savedProgress
    ? audioFiles.find((f) => f._id === savedProgress.audioFileId)
    : null;

  const handlePlay = (
    file: AudioTabProps["audioFiles"] extends Array<infer T> | undefined ? T : never
  ) => {
    const isCurrentFile = currentTrack?.audioFileId === file._id;
    if (isCurrentFile) {
      togglePlayPause();
    } else {
      // If this file has saved progress, resume from it
      const hasProgress = savedProgress && savedProgress.audioFileId === file._id;
      play(
        {
          audioFileId: file._id,
          displayName: file.displayName || file.fileName,
          bookId: bookIdProp,
          bookTitle,
          coverImageR2Key,
          seriesName,
          seriesOrder,
          partNumber: file.partNumber,
          totalParts,
        },
        hasProgress
          ? {
              initialPosition: savedProgress.positionSeconds,
              initialPlaybackRate: savedProgress.playbackRate,
            }
          : undefined
      );
    }
  };

  const handleResume = () => {
    if (!savedFile || !savedProgress) return;
    play(
      {
        audioFileId: savedFile._id,
        displayName: savedFile.displayName || savedFile.fileName,
        bookId: bookIdProp,
        bookTitle,
        coverImageR2Key,
        seriesName,
        seriesOrder,
        partNumber: savedFile.partNumber,
        totalParts,
      },
      {
        initialPosition: savedProgress.positionSeconds,
        initialPlaybackRate: savedProgress.playbackRate,
      }
    );
  };

  const handleDownloadAll = () => {
    downloadAllForBook(
      bookIdProp,
      audioFiles.map((f) => ({
        _id: f._id,
        displayName: f.displayName || f.fileName,
        fileSize: f.fileSize,
        format: f.format,
      })),
      bookTitle
    );
  };

  const handleDeleteAllDownloads = () => {
    Alert.alert("Delete All Downloads", `Remove all downloaded files for "${bookTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDownloadsForBook(bookIdProp),
      },
    ]);
  };

  // Build resume label
  const resumeLabel =
    savedFile && savedProgress
      ? totalParts > 1 && savedFile.partNumber !== undefined
        ? `Resume from Part ${savedFile.partNumber} at ${formatTime(savedProgress.positionSeconds)}`
        : `Resume at ${formatTime(savedProgress.positionSeconds)}`
      : null;

  return (
    <View className="gap-2 pt-2">
      {/* Resume button */}
      {savedFile && resumeLabel && currentTrack?.audioFileId !== savedFile._id && (
        <Button onPress={handleResume} className="mb-1">
          <View className="flex-row items-center gap-2">
            <Play size={16} color={colors.primaryForeground} fill={colors.primaryForeground} />
            <Text className="text-sm font-medium text-primary-foreground">{resumeLabel}</Text>
          </View>
        </Button>
      )}

      {/* Download All / Delete All Downloads */}
      {!allDownloaded && (
        <Button variant="outline" size="sm" onPress={handleDownloadAll}>
          <View className="flex-row items-center gap-2">
            <ArrowDownToLine size={14} className="text-foreground" />
            <Text className="text-xs font-medium text-foreground">Download All</Text>
          </View>
        </Button>
      )}
      {someDownloaded && (
        <Button variant="outline" size="sm" onPress={handleDeleteAllDownloads}>
          <View className="flex-row items-center gap-2">
            <Trash2 size={14} color={colors.destructive} />
            <Text className="text-xs font-medium" style={{ color: colors.destructive }}>
              Delete All Downloads
            </Text>
          </View>
        </Button>
      )}

      {audioFiles.map((file) => {
        const isCurrentFile = currentTrack?.audioFileId === file._id;
        const isFileLoading = isCurrentFile && isLoading;
        const isFilePlaying = isCurrentFile && isPlaying;
        const fileDownloaded = isDownloaded(file._id);
        const downloadProgress = getDownloadProgress(file._id);
        const isDownloading = downloadProgress !== null;

        // Show saved position indicator for the file with progress (when not currently playing)
        const hasSavedPosition =
          savedProgress && savedProgress.audioFileId === file._id && !isCurrentFile;

        const handleDownloadPress = () => {
          if (isDownloading) {
            cancelDownload(file._id);
          } else if (fileDownloaded) {
            Alert.alert(
              "Delete Download",
              `Delete downloaded file "${file.displayName || file.fileName}"?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteDownload(file._id),
                },
              ]
            );
          } else {
            downloadFile(
              file._id,
              bookIdProp,
              bookTitle,
              file.displayName || file.fileName,
              file.fileSize,
              file.format
            );
          }
        };

        return (
          <Pressable
            key={file._id}
            onPress={() => handlePlay(file)}
            className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted/50"
          >
            {/* Play/Pause button */}
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${isCurrentFile ? "bg-primary" : "bg-primary/10"}`}
            >
              {isFileLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isCurrentFile ? colors.primaryForeground : colors.primary}
                />
              ) : isFilePlaying ? (
                <Pause
                  size={18}
                  color={isCurrentFile ? colors.primaryForeground : colors.primary}
                />
              ) : (
                <Play
                  size={18}
                  color={isCurrentFile ? colors.primaryForeground : colors.primary}
                  fill={isCurrentFile ? colors.primaryForeground : "transparent"}
                />
              )}
            </View>

            {/* File info */}
            <View className="min-w-0 flex-1 gap-0.5">
              <Text
                className={`text-sm font-medium ${isCurrentFile ? "text-primary" : "text-foreground"}`}
                numberOfLines={1}
              >
                {file.displayName || file.fileName}
              </Text>
              <Text className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</Text>
              {hasSavedPosition && (
                <Text className="text-xs text-primary">
                  Paused at {formatTime(savedProgress.positionSeconds)}
                </Text>
              )}
            </View>

            {/* Download status button */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleDownloadPress();
              }}
              hitSlop={8}
              className="items-center justify-center active:opacity-70"
            >
              {isDownloading ? (
                <View className="items-center justify-center" style={{ width: 28, height: 28 }}>
                  <DownloadProgressRing progress={downloadProgress} color={colors.primary} />
                  <View className="absolute">
                    <X size={10} color={colors.primary} />
                  </View>
                </View>
              ) : fileDownloaded ? (
                <CheckCircle size={20} color={colors.primary} />
              ) : (
                <ArrowDownToLine size={20} color={colors.mutedForeground} />
              )}
            </Pressable>

            {/* Part number badge */}
            {file.partNumber !== undefined && (
              <Badge variant="secondary">{`Part ${file.partNumber}`}</Badge>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
