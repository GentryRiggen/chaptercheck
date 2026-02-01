import { Suspense } from "react";

import { SignInCard } from "@/components/auth/SignInCard";

function SignInFallback() {
  return <div className="h-64 w-full max-w-md animate-pulse rounded-xl bg-muted" />;
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<SignInFallback />}>
        <SignInCard />
      </Suspense>
    </div>
  );
}
