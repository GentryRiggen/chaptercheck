"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { BookCover } from "@/components/books/BookCover";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpen, Users, Library, Star, BarChart3 } from "lucide-react";

function RecentBooks() {
  const books = useQuery(api.books.queries.getRecentBooks, { limit: 4 });

  if (books === undefined) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted aspect-[2/3] rounded-lg mb-2" />
            <div className="h-4 bg-muted rounded w-3/4 mb-1" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No books yet</p>
          <Link href="/books">
            <Button>Add your first book</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {books.map((book) => (
        <Link
          key={book._id}
          href={`/books/${book._id}`}
          className="group"
        >
          <div className="overflow-hidden rounded-lg shadow-md group-hover:shadow-xl transition-shadow">
            <BookCover
              coverImageR2Key={book.coverImageR2Key}
              title={book.title}
              size="lg"
              className="w-full aspect-[2/3]"
            />
          </div>
          <h3 className="font-medium mt-2 line-clamp-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          {book.authors && book.authors.length > 0 && (
            <p className="text-sm text-muted-foreground line-clamp-1">
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
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse text-center">
            <div className="bg-muted w-16 h-16 rounded-full mx-auto mb-2" />
            <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (authors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No authors yet</p>
          <Link href="/authors">
            <Button>Add your first author</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
      {authors.map((author) => (
        <Link
          key={author._id}
          href={`/authors/${author._id}`}
          className="group text-center"
        >
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20">
            <AuthorImage
              imageR2Key={author.imageR2Key}
              name={author.name}
              size="lg"
              className="w-full h-full group-hover:ring-2 ring-primary transition-all"
            />
          </div>
          <p className="text-sm font-medium mt-2 line-clamp-1 group-hover:text-primary transition-colors">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Track Your Reading Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Organize your book collection, track your reading progress, and discover your next favorite read.
          </p>
          <Link href="/sign-in">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </section>

        <section className="py-16 border-t">
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <Library className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Organize Your Library</h3>
                <p className="text-muted-foreground">
                  Catalog your books with cover images, authors, and detailed information.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Star className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Rate & Review</h3>
                <p className="text-muted-foreground">
                  Keep track of your thoughts with ratings and personal reviews.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
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
            <div className="flex items-center justify-between mb-6">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return isSignedIn ? <Dashboard /> : <LandingPage />;
}
