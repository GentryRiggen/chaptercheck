"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { formatListeningTime, getGreeting } from "@chaptercheck/shared/utils";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  Library,
  Star,
} from "lucide-react";
import Link from "next/link";

import { BookCard } from "@/components/books/BookCard";
import { ListeningCard } from "@/components/books/ListeningCard";
import { HeroListeningCard } from "@/components/home/HeroListeningCard";
import { ScrollRow } from "@/components/home/ScrollRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";

function GreetingHeader() {
  const { user } = useUser();
  const firstName = user?.firstName || "there";

  return (
    <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
      {getGreeting()}, {firstName}
    </h1>
  );
}

function LibraryStats() {
  const stats = useQuery(api.books.queries.getHomeStats);

  if (!stats) return null;

  const items = [
    {
      icon: BookOpen,
      value: stats.totalBooks,
      label: "Books",
    },
    {
      icon: Clock,
      value: formatListeningTime(stats.totalListeningSeconds),
      label: "Listened",
    },
    {
      icon: CheckCircle2,
      value: stats.booksRead,
      label: "Finished",
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {items.map((item) => (
          <Card key={item.label} className="bg-card/50">
            <CardContent className="flex flex-col items-center gap-1.5 p-4 sm:flex-row sm:gap-3 sm:p-5">
              <item.icon className="h-5 w-5 text-primary/70" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold leading-tight sm:text-xl">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Dashboard() {
  const listeningItems = useQuery(api.listeningProgress.queries.getRecentlyListening, {
    limit: 6,
  });
  const recentBooks = useQuery(api.books.queries.getRecentBooks, { limit: 8 });
  const topRatedBooks = useQuery(api.books.queries.getTopRatedBooks, { limit: 8 });

  const hasListening = listeningItems && listeningItems.length > 0;
  const heroItem = hasListening ? listeningItems[0] : null;
  const remainingListening = hasListening ? listeningItems.slice(1) : [];
  const hasBooks = recentBooks && recentBooks.length > 0;
  const hasTopRated = topRatedBooks && topRatedBooks.length > 0;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:py-12 lg:px-8">
        <div className="space-y-10">
          {/* Greeting */}
          <GreetingHeader />

          {/* Hero Continue Listening */}
          {heroItem && <HeroListeningCard item={heroItem} />}

          {/* No listening progress prompt */}
          {listeningItems && listeningItems.length === 0 && hasBooks && (
            <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 ring-1 ring-primary/10">
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <Headphones className="h-12 w-12 text-primary/40" />
                <p className="text-center text-muted-foreground">
                  Start listening to a book and your progress will appear here.
                </p>
                <Link href="/books">
                  <Button variant="outline" className="mt-1 gap-2">
                    Browse library <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Continue Listening Row (remaining items) */}
          {remainingListening.length > 0 && (
            <ScrollRow title="Continue Listening">
              {remainingListening.map((item) => (
                <div key={item._id} className="w-36 flex-shrink-0 snap-start sm:w-40">
                  <ListeningCard
                    bookId={item.bookId}
                    book={item.book}
                    audioFile={item.audioFile}
                    progressFraction={item.progressFraction}
                    totalParts={item.totalParts}
                    lastListenedAt={item.lastListenedAt}
                    className="bg-transparent p-0 shadow-none ring-0 hover:bg-transparent hover:shadow-none hover:ring-0"
                  />
                </div>
              ))}
            </ScrollRow>
          )}

          {/* Recently Added Row */}
          {hasBooks && (
            <ScrollRow title="Recently Added" viewAllHref="/books">
              {recentBooks.map((book) => (
                <div key={book._id} className="w-36 flex-shrink-0 snap-start sm:w-40">
                  <BookCard
                    book={book}
                    className="bg-transparent p-0 shadow-none ring-0 hover:bg-transparent hover:shadow-none hover:ring-0"
                  />
                </div>
              ))}
            </ScrollRow>
          )}

          {/* No books empty state */}
          {recentBooks && recentBooks.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-4 text-muted-foreground">No books yet</p>
                <Link href="/books">
                  <Button>Add your first book</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Top Rated Row */}
          {hasTopRated && (
            <ScrollRow title="Top Rated">
              {topRatedBooks.map((book) => (
                <div key={book._id} className="w-36 flex-shrink-0 snap-start sm:w-40">
                  <BookCard
                    book={book}
                    className="bg-transparent p-0 shadow-none ring-0 hover:bg-transparent hover:shadow-none hover:ring-0"
                  />
                </div>
              ))}
            </ScrollRow>
          )}

          {/* Library Stats */}
          <LibraryStats />
        </div>
      </main>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="py-20 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Track Your Reading Journey
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Organize your book collection, track your reading progress, and discover your next
            favorite read.
          </p>
          <Link href="/sign-in">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </section>

        <section className="border-t py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <Library className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Organize Your Library</h3>
                <p className="text-muted-foreground">
                  Catalog your books with cover images, authors, and detailed information.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Star className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Rate & Review</h3>
                <p className="text-muted-foreground">
                  Keep track of your thoughts with ratings and personal reviews.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Track Progress</h3>
                <p className="text-muted-foreground">
                  Monitor your reading habits and set goals to read more.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  usePageTitle(isSignedIn ? "Home" : null);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return isSignedIn ? <Dashboard /> : <LandingPage />;
}
