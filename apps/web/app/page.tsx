"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowRight, BarChart3, BookOpen, Library, Star, Users } from "lucide-react";
import Link from "next/link";

import { AuthorCard } from "@/components/authors/AuthorCard";
import { BookCard } from "@/components/books/BookCard";
import { ListeningCard } from "@/components/books/ListeningCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";

function ContinueListening() {
  const items = useQuery(api.listeningProgress.queries.getRecentlyListening, { limit: 6 });

  // Don't render section at all if empty or loading
  if (!items || items.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Continue Listening</h2>
      </div>
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {items.map((item) => (
          <ListeningCard
            key={item._id}
            bookId={item.bookId}
            book={item.book}
            audioFile={item.audioFile}
            progressFraction={item.progressFraction}
            totalParts={item.totalParts}
            lastListenedAt={item.lastListenedAt}
          />
        ))}
      </div>
    </section>
  );
}

function RecentBooks() {
  const books = useQuery(api.books.queries.getRecentBooks, { limit: 6 });

  if (books === undefined) {
    return (
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="mb-2 aspect-[2/3] rounded-lg bg-muted" />
            <div className="mb-1 h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">No books yet</p>
          <Link href="/books">
            <Button>Add your first book</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
      {books.map((book) => (
        <BookCard key={book._id} book={book} />
      ))}
    </div>
  );
}

function RecentAuthors() {
  const authors = useQuery(api.authors.queries.getRecentAuthors, { limit: 6 });

  if (authors === undefined) {
    return (
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse text-center">
            <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-muted" />
            <div className="mx-auto h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (authors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">No authors yet</p>
          <Link href="/authors">
            <Button>Add your first author</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
      {authors.map((author) => (
        <AuthorCard key={author._id} author={author} variant="compact" />
      ))}
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

function Dashboard() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-12 pb-24 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <ContinueListening />

          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Recent Books</h2>
              <Link href="/books">
                <Button variant="ghost" className="gap-2">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <RecentBooks />
          </section>

          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Recent Authors</h2>
              <Link href="/authors">
                <Button variant="ghost" className="gap-2">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <RecentAuthors />
          </section>
        </div>
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
