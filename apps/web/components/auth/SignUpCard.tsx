"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type SignUpFormData, signUpSchema } from "@chaptercheck/shared/validations/auth";
import { useSignUp, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Camera, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { OtpVerificationForm } from "./OtpVerificationForm";

type Step = "info" | "otp" | "photo";

export function SignUpCard() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { user } = useUser();
  const ensureUser = useMutation(api.users.mutations.ensureUser);

  const [step, setStep] = useState<Step>("info");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  // Photo step state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  const handleInfoSubmit = async (data: SignUpFormData) => {
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setFormError(undefined);
    setEmail(data.email);
    setFirstName(data.firstName);

    try {
      await signUp.create({
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.email,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setStep("otp");
    } catch (err) {
      // Anti-enumeration: show a generic error for most cases
      const clerkError = err as { errors?: Array<{ code?: string }> };
      const errorCode = clerkError.errors?.[0]?.code;

      if (errorCode === "form_identifier_exists") {
        // Don't reveal that the email exists
        setFormError("Unable to create account. Please try a different email or sign in.");
      } else {
        console.error("Sign-up error:", err);
        setFormError("Something went wrong. Please try again.");
      }
    }

    setIsLoading(false);
  };

  const handleOtpSubmit = async (code: string) => {
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setOtpError(undefined);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Ensure user exists in Convex before proceeding (webhook race condition)
        await ensureUser();
        setStep("photo");
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setOtpError("Invalid or expired code. Please try again.");
    }

    setIsLoading(false);
  };

  const handleOtpBack = () => {
    setStep("info");
    setOtpError(undefined);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB max

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !user) return;

    setIsLoading(true);
    try {
      await user.setProfileImage({ file: photoFile });
    } catch (err) {
      console.error("Photo upload error:", err);
      // Non-critical — skip silently
    }
    setIsLoading(false);
    router.push("/");
  };

  const handlePhotoSkip = () => {
    router.push("/");
  };

  const getTitle = () => {
    switch (step) {
      case "info":
        return "Create your account";
      case "otp":
        return "Verify your email";
      case "photo":
        return "Add a profile photo";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "info":
        return "Enter your details to get started";
      case "otp":
        return "Enter the code we sent to your email";
      case "photo":
        return "This helps others recognize you (optional)";
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <Logo size={48} />
        </div>
        <CardTitle className="text-2xl">{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {step === "info" && (
          <div className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleInfoSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Jane"
                            autoComplete="given-name"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            autoComplete="family-name"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}

                <div id="clerk-captcha" />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {step === "otp" && (
          <OtpVerificationForm
            email={email}
            onSubmit={handleOtpSubmit}
            onBack={handleOtpBack}
            isLoading={isLoading}
            error={otpError}
          />
        )}

        {step === "photo" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Profile preview"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-medium text-muted-foreground">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handlePhotoRemove}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {!photoPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Choose photo
                </Button>
              ) : (
                <Button type="button" onClick={handlePhotoUpload} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload photo
                    </>
                  )}
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handlePhotoSkip}
              disabled={isLoading}
            >
              Skip for now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
