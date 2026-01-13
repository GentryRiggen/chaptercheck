"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BooksPage() {
  const books = useQuery(api.books.queries.listBooks);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Books</h1>
          <Button asChild>
            <Link href="/books/new">Add Book</Link>
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {books === undefined ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading books...</p>
          </div>
        ) : books.page.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No books yet</p>
            <Link href="/books/new" className="text-primary hover:underline">
              Create your first book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.page.map((book) => (
              <Link key={book._id} href={`/books/${book._id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {book.coverImageUrl && (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{book.title}</CardTitle>
                    {book.subtitle && (
                      <p className="text-muted-foreground text-sm">
                        {book.subtitle}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {book.authors && book.authors.length > 0 && (
                      <p className="text-sm text-muted-foreground mb-3">
                        by {book.authors.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {book.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
