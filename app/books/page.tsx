"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function BooksPage() {
  const books = useQuery(api.books.queries.listBooks);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Books</h1>
          <Link
            href="/books/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Book
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {books === undefined ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading books...</p>
          </div>
        ) : books.page.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No books yet</p>
            <Link href="/books/new" className="text-blue-600 hover:underline">
              Create your first book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.page.map((book) => (
              <Link
                key={book._id}
                href={`/books/${book._id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {book.coverImageUrl && (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2">{book.title}</h2>
                  {book.subtitle && (
                    <p className="text-gray-600 text-sm mb-2">
                      {book.subtitle}
                    </p>
                  )}
                  {book.authors && book.authors.length > 0 && (
                    <p className="text-gray-500 text-sm">
                      by {book.authors.map((a) => a.name).join(", ")}
                    </p>
                  )}
                  {book.description && (
                    <p className="text-gray-600 mt-3 line-clamp-3 text-sm">
                      {book.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
