import { SignInButton, SignOutButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ChapterCheck</h1>
          <div className="flex items-center gap-4">
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
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome to ChapterCheck</h2>
          <p className="text-xl text-gray-600 mb-8">Your personal audiobook library</p>

          <SignedOut>
            <p className="text-gray-500">Sign in to get started</p>
          </SignedOut>

          <SignedIn>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-green-800 font-medium">
                ✓ Authentication is working!
              </p>
              <p className="text-green-600 mt-2">
                You're successfully signed in with Clerk + Convex
              </p>
            </div>
          </SignedIn>
        </div>
      </main>
    </div>
  );
}
