import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold hover:text-blue-600">
            ChapterCheck
          </Link>
          <div className="flex items-center gap-6">
            <SignedIn>
              <Link href="/books" className="text-gray-700 hover:text-blue-600">
                Books
              </Link>
              <Link href="/authors" className="text-gray-700 hover:text-blue-600">
                Authors
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Welcome to ChapterCheck</h2>
          <p className="text-xl text-gray-600 mb-8">Your personal audiobook library</p>

          <SignedOut>
            <p className="text-gray-500">Sign in to get started</p>
          </SignedOut>
        </div>

        <SignedIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/books"
              className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-2xl font-semibold mb-2">Books</h3>
              <p className="text-gray-600">
                Manage your audiobook collection
              </p>
            </Link>

            <Link
              href="/authors"
              className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">✍️</div>
              <h3 className="text-2xl font-semibold mb-2">Authors</h3>
              <p className="text-gray-600">
                Browse and manage authors
              </p>
            </Link>
          </div>

          <div className="mt-12 max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Phase 1B Complete!
            </h3>
            <p className="text-blue-700">
              You can now create and manage books and authors. Audio file upload coming in Phase 1C.
            </p>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
