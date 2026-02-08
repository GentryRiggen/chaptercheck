import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { type ReviewSortOption } from "@chaptercheck/convex-backend/bookUserData/queries";
import { formatBytes, formatRelativeDate } from "@chaptercheck/shared/utils";
import { useUser } from "@clerk/clerk-expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FileAudio, MessageSquarePlus } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "convex/react";

import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/books/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 10;
const PRIMARY_COLOR = "hsl(120, 13%, 60%)";

const SORT_OPTIONS: SelectOption[] = [
  { label: "Most recent", value: "recent" },
  { label: "Oldest first", value: "oldest" },
  { label: "Highest rated", value: "highest" },
  { label: "Lowest rated", value: "lowest" },
];

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

  const [activeTab, setActiveTab] = useState("reviews");

  // Loading state
  if (book === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: "Book" }} />
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
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
      <View className="flex-row gap-4 px-4 pt-4">
        {/* Cover */}
        <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="lg" />

        {/* Book Info */}
        <View className="min-w-0 flex-1 gap-1">
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

          {/* Title */}
          <Text className="text-xl font-bold leading-tight text-foreground">{book.title}</Text>

          {/* Subtitle */}
          {book.subtitle && (
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
              {book.subtitle}
            </Text>
          )}

          {/* Authors */}
          {book.authors.length > 0 && (
            <View className="flex-row flex-wrap items-center gap-x-1">
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
                    <Text className="ml-1 text-xs text-muted-foreground">({author.role})</Text>
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
            <View className="flex-row flex-wrap gap-1 pt-1">
              {genres.map((genre) => (
                <Badge key={genre._id} variant="secondary">
                  {genre.name}
                </Badge>
              ))}
            </View>
          )}

          {/* Published year + language */}
          <View className="flex-row flex-wrap gap-x-3 pt-1">
            {book.publishedYear && (
              <Text className="text-xs text-muted-foreground">{book.publishedYear}</Text>
            )}
            {book.language && (
              <Text className="text-xs text-muted-foreground">{book.language}</Text>
            )}
          </View>

          {/* Rating */}
          {hasRating && (
            <View className="flex-row items-center gap-1.5 pt-1">
              <StarRating value={Math.round(book.averageRating!)} readonly size="sm" />
              <Text className="text-xs text-muted-foreground">({book.ratingCount})</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description Section */}
      {book.description && (
        <View className="gap-2 px-4 pt-6">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </Text>
          <Text className="text-sm leading-relaxed text-foreground">{book.description}</Text>
        </View>
      )}

      {/* Tabbed Section */}
      <View className="px-4 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews">
            <ReviewsTab bookId={id} myBookData={myBookData} />
          </TabsContent>

          <TabsContent value="audio">
            <AudioTab audioFiles={audioFiles} />
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
        isReviewPrivate: boolean;
        userId: Id<"users">;
      }
    | null
    | undefined;
}

function ReviewsTab({ bookId, myBookData }: ReviewsTabProps) {
  const { user } = useUser();
  const [sortBy, setSortBy] = useState<ReviewSortOption>("recent");
  const [cursor, setCursor] = useState<string | null>(null);
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
    <View className="gap-4 pt-2">
      {/* Sort select + Write a Review button */}
      <View className="flex-row items-center justify-between gap-2">
        <Button variant="outline" size="sm" onPress={() => {}}>
          <View className="flex-row items-center gap-1.5">
            <MessageSquarePlus size={14} className="text-foreground" />
            <Text className="text-xs font-medium text-foreground">Write a Review</Text>
          </View>
        </Button>

        <Select
          value={sortBy}
          onValueChange={handleSortChange}
          options={SORT_OPTIONS}
          className="w-36"
        />
      </View>

      {/* Loading state */}
      {isInitialLoading && (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
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
        <View className="gap-2">
          <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your Review
          </Text>
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
        <View className="gap-3">
          {hasOwnReview && (
            <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Community Reviews
            </Text>
          )}
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
}

function AudioTab({ audioFiles }: AudioTabProps) {
  if (audioFiles === undefined) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
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

  return (
    <View className="gap-2 pt-2">
      {audioFiles.map((file) => (
        <View
          key={file._id}
          className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          {/* File icon */}
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileAudio size={20} className="text-primary" />
          </View>

          {/* File info */}
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
              {file.displayName || file.fileName}
            </Text>
            <Text className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</Text>
          </View>

          {/* Part number badge */}
          {file.partNumber !== undefined && (
            <Badge variant="secondary">{`Part ${file.partNumber}`}</Badge>
          )}
        </View>
      ))}
    </View>
  );
}
