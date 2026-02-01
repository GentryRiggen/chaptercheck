import { Suspense } from "react";
import { SignInCard } from "@/components/auth/SignInCard";

function SignInFallback() {
  return (
    <div className="w-full max-w-md h-64 animate-pulse bg-muted rounded-xl" />
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<SignInFallback />}>
        <SignInCard />
      </Suspense>
    </div>
  );
}
