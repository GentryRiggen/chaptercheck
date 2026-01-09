"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function AuthorDetailPage({
  params,
}: {
  params: { authorId: Id<"authors"> };
}) {
  const router = useRouter();
  const author = useQuery(api.authors.queries.getAuthor, {
    authorId: params.authorId,
  });
  const books = useQuery(api.authors.queries.getAuthorBooks, {
    authorId: params.authorId,
  });
  const deleteAuthor = useMutation(api.authors.mutations.deleteAuthor);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this author?")) {
      return;
    }

    try {
      await deleteAuthor({ authorId: params.authorId });
      router.push("/authors");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete author");
    }
  };

  if (author === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (author === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Author not found</p>
          <Link href="/authors" className="text-blue-600 hover:underline">
            Back to Authors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <Link
                href="/authors"
                className="text-sm text-blue-600 hover:underline mb-2 inline-block"
              >
                ← Back to Authors
              </Link>
              <h1 className="text-3xl font-bold">{author.name}</h1>
            </div>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete Author
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {author.bio && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Bio</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{author.bio}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Books</h2>
          {books === undefined ? (
            <p className="text-gray-500">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-gray-500">No books by this author yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Link
                  key={book._id}
                  href={`/books/${book._id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold">{book.title}</h3>
                  {book.subtitle && (
                    <p className="text-sm text-gray-600 mt-1">
                      {book.subtitle}
                    </p>
                  )}
                  {book.role && (
                    <p className="text-xs text-gray-500 mt-2">
                      Role: {book.role}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
