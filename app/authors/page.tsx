"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function AuthorsPage() {
  const authors = useQuery(api.authors.queries.listAuthors);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Authors</h1>
          <Link
            href="/authors/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Author
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {authors === undefined ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading authors...</p>
          </div>
        ) : authors.page.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No authors yet</p>
            <Link
              href="/authors/new"
              className="text-blue-600 hover:underline"
            >
              Create your first author
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authors.page.map((author) => (
              <Link
                key={author._id}
                href={`/authors/${author._id}`}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{author.name}</h2>
                {author.bio && (
                  <p className="text-gray-600 line-clamp-3">{author.bio}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
