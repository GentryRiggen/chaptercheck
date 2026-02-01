"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowRight, BarChart3, BookOpen, Library, Star, Users } from "lucide-react";
import Link from "next/link";

import { AuthorImage } from "@/components/authors/AuthorImage";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

function RecentBooks() {
  const books = useQuery(api.books.queries.getRecentBooks, { limit: 4 });

  if (books === undefined) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {books.map((book) => (
        <Link key={book._id} href={`/books/${book._id}`} className="group">
          <div className="overflow-hidden rounded-lg shadow-md transition-shadow group-hover:shadow-xl">
            <BookCover
              coverImageR2Key={book.coverImageR2Key}
              title={book.title}
              size="lg"
              className="aspect-[2/3] w-full"
            />
          </div>
          <h3 className="mt-2 line-clamp-1 font-medium transition-colors group-hover:text-primary">
            {book.title}
          </h3>
          {book.authors && book.authors.length > 0 && (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {book.authors.map((a) => a.name).join(", ")}
            </p>
          )}
        </Link>
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
        <Link key={author._id} href={`/authors/${author._id}`} className="group text-center">
          <div className="mx-auto h-16 w-16 md:h-20 md:w-20">
            <AuthorImage
              imageR2Key={author.imageR2Key}
              name={author.name}
              size="lg"
              className="h-full w-full ring-primary transition-all group-hover:ring-2"
            />
          </div>
          <p className="mt-2 line-clamp-1 text-sm font-medium transition-colors group-hover:text-primary">
            {author.name}
          </p>
        </Link>
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
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-12">
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

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return isSignedIn ? <Dashboard /> : <LandingPage />;
}
