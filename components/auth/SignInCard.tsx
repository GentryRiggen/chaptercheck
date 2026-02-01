"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { OtpVerificationForm } from "./OtpVerificationForm";
import { SignInForm } from "./SignInForm";

type Step = "email" | "otp";

export function SignInCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState<string>();

  const redirectUrl = searchParams.get("redirect_url") || "/";

  const handleEmailSubmit = async (submittedEmail: string) => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setEmail(submittedEmail);

    try {
      const signInAttempt = await signIn.create({
        identifier: submittedEmail,
      });

      const emailFactor = signInAttempt.supportedFirstFactors?.find(
        (factor): factor is typeof factor & { emailAddressId: string } =>
          factor.strategy === "email_code" && "emailAddressId" in factor
      );

      if (emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
      }
    } catch (err) {
      // Security: Don't expose whether email exists
      // Still transition to OTP screen to prevent enumeration
      console.error("Sign-in preparation error:", err);
    }

    // Always transition to OTP screen regardless of success/failure
    setStep("otp");
    setIsLoading(false);
  };

  const handleOtpSubmit = async (code: string) => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setOtpError(undefined);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl);
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setOtpError("Invalid or expired code. Please try again.");
    }

    setIsLoading(false);
  };

  const handleBack = () => {
    setStep("email");
    setOtpError(undefined);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <Logo size={48} showBackground />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          {step === "email"
            ? "Sign in to your ChapterCheck account"
            : "Enter the code we sent to your email"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <SignInForm onSubmit={handleEmailSubmit} isLoading={isLoading} />
        ) : (
          <OtpVerificationForm
            email={email}
            onSubmit={handleOtpSubmit}
            onBack={handleBack}
            isLoading={isLoading}
            error={otpError}
          />
        )}
      </CardContent>
    </Card>
  );
}
