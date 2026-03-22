import { type Metadata } from "next";
import { Suspense } from "react";

import { SignUpCard } from "@/components/auth/SignUpCard";

export const metadata: Metadata = {
  title: "Sign Up | Chapter Check",
};

function SignUpFallback() {
  return <div className="h-64 w-full max-w-md animate-pulse rounded-xl bg-muted" />;
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<SignUpFallback />}>
        <SignUpCard />
      </Suspense>
    </div>
  );
}
