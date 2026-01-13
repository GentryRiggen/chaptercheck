"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { AudioUpload } from "@/components/audio/AudioUpload";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { useState } from "react";

export default function BookDetailPage({
  params,
}: {
  params: { bookId: Id<"books"> };
}) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const book = useQuery(api.books.queries.getBook, {
    bookId: params.bookId,
  });
  const audioFiles = useQuery(api.audioFiles.queries.getAudioFilesForBook, {
    bookId: params.bookId,
  });
  const deleteBook = useMutation(api.books.mutations.deleteBook);

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleAudioDelete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this book?")) {
      return;
    }

    try {
      await deleteBook({ bookId: params.bookId });
      router.push("/books");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete book");
    }
  };

  if (book === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (book === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Book not found</p>
          <Link href="/books" className="text-blue-600 hover:underline">
            Back to Books
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
                href="/books"
                className="text-sm text-blue-600 hover:underline mb-2 inline-block"
              >
                ← Back to Books
              </Link>
              <h1 className="text-3xl font-bold">{book.title}</h1>
              {book.subtitle && (
                <p className="text-xl text-gray-600 mt-2">{book.subtitle}</p>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete Book
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {book.coverImageUrl ? (
              <img
                src={book.coverImageUrl}
                alt={book.title}
                className="w-full rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">No cover image</p>
              </div>
            )}

            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Details</h2>
              <dl className="space-y-2 text-sm">
                {book.isbn && (
                  <>
                    <dt className="text-gray-500">ISBN</dt>
                    <dd className="font-medium">{book.isbn}</dd>
                  </>
                )}
                {book.publishedYear && (
                  <>
                    <dt className="text-gray-500 mt-3">Published</dt>
                    <dd className="font-medium">{book.publishedYear}</dd>
                  </>
                )}
                {book.language && (
                  <>
                    <dt className="text-gray-500 mt-3">Language</dt>
                    <dd className="font-medium">{book.language}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {book.authors && book.authors.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Authors</h2>
                <div className="flex flex-wrap gap-2">
                  {book.authors.map((author) => (
                    <Link
                      key={author._id}
                      href={`/authors/${author._id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
                    >
                      {author.name}
                      {author.role && author.role !== "author" && (
                        <span className="ml-2 text-xs">({author.role})</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {book.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {book.description}
                </p>
              </div>
            )}

            <div className="space-y-6">
              <AudioUpload
                bookId={params.bookId}
                onUploadComplete={handleUploadComplete}
              />

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Audio Files</h2>
                {audioFiles === undefined ? (
                  <p className="text-gray-500">Loading audio files...</p>
                ) : audioFiles.length === 0 ? (
                  <p className="text-gray-500">
                    No audio files yet. Upload one above to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {audioFiles.map((audioFile) => (
                      <AudioPlayer
                        key={audioFile._id}
                        audioFile={audioFile}
                        onDelete={handleAudioDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
