"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { type AccountSettingsFormValues, accountSettingsSchema } from "@/lib/validations/auth";

export default function AccountPage() {
  usePageTitle("Account");
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "verify">("input");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string>();

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  // Sync form with user data when it loads/changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    }
  }, [user, form]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  const handleProfileSubmit = async (data: AccountSettingsFormValues) => {
    setIsUpdatingProfile(true);
    setProfileSuccess(false);

    try {
      await user.update({
        firstName: data.firstName,
        lastName: data.lastName || undefined,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }

    setIsUpdatingProfile(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;

    setIsUpdatingEmail(true);
    setEmailError(undefined);

    try {
      const emailAddress = await user.createEmailAddress({ email: newEmail });
      await emailAddress.prepareVerification({ strategy: "email_code" });
      setEmailStep("verify");
    } catch (err: unknown) {
      console.error("Failed to add email:", err);
      // Extract error message from Clerk error
      const clerkError = err as { errors?: Array<{ message?: string }> };
      const message =
        clerkError.errors?.[0]?.message || (err instanceof Error ? err.message : null);

      if (message?.toLowerCase().includes("taken")) {
        setEmailError("This email address is already in use.");
      } else if (message) {
        setEmailError(message);
      } else {
        setEmailError("Failed to send verification email. Please try again.");
      }
    }

    setIsUpdatingEmail(false);
  };

  const handleEmailVerify = async () => {
    if (!emailVerificationCode.trim()) return;

    setIsUpdatingEmail(true);
    setEmailError(undefined);

    try {
      const emailAddress = user.emailAddresses.find((e) => e.emailAddress === newEmail);

      if (!emailAddress) {
        setEmailError("Email address not found. Please try again.");
        setIsUpdatingEmail(false);
        return;
      }

      await emailAddress.attemptVerification({ code: emailVerificationCode });
      await user.update({ primaryEmailAddressId: emailAddress.id });

      // Try to clean up old email addresses (may fail if linked to OAuth)
      const oldEmails = user.emailAddresses.filter((e) => e.id !== emailAddress.id);
      for (const oldEmail of oldEmails) {
        try {
          await oldEmail.destroy();
        } catch {
          // Ignore - email may be linked to a Connected Account
        }
      }

      setEmailDialogOpen(false);
      setEmailStep("input");
      setNewEmail("");
      setEmailVerificationCode("");
    } catch (err) {
      console.error("Failed to verify email:", err);
      // Check if it's a verification error or something else
      const errorMessage = err instanceof Error ? err.message : "";
      if (
        errorMessage.includes("incorrect") ||
        errorMessage.includes("expired") ||
        errorMessage.includes("code")
      ) {
        setEmailError("Invalid or expired code. Please try again.");
      } else {
        setEmailError("Failed to update email. Please try again.");
      }
    }

    setIsUpdatingEmail(false);
  };

  const handleSignOut = () => {
    signOut({ redirectUrl: "/sign-in" });
  };

  const closeEmailDialog = () => {
    setEmailDialogOpen(false);
    setEmailStep("input");
    setNewEmail("");
    setEmailVerificationCode("");
    setEmailError(undefined);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isUpdatingProfile} />
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
                        <Input {...field} disabled={isUpdatingProfile} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-4">
                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                  {profileSuccess && (
                    <span className="text-sm text-green-600">Profile updated!</span>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Manage your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current email</p>
              <p className="font-medium">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
            <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
              Change email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign Out</CardTitle>
            <CardDescription>Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={closeEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{emailStep === "input" ? "Change email" : "Verify email"}</DialogTitle>
            <DialogDescription>
              {emailStep === "input"
                ? "Enter your new email address"
                : `We sent a verification code to ${newEmail}`}
            </DialogDescription>
          </DialogHeader>

          {emailStep === "input" ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="new-email" className="text-sm font-medium">
                  New email
                </label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isUpdatingEmail}
                />
              </div>
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="verification-code" className="text-sm font-medium">
                  Verification code
                </label>
                <Input
                  id="verification-code"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  value={emailVerificationCode}
                  onChange={(e) => setEmailVerificationCode(e.target.value)}
                  disabled={isUpdatingEmail}
                />
              </div>
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEmailDialog}>
              Cancel
            </Button>
            <Button
              onClick={emailStep === "input" ? handleEmailChange : handleEmailVerify}
              disabled={isUpdatingEmail}
            >
              {isUpdatingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {emailStep === "input" ? "Sending..." : "Verifying..."}
                </>
              ) : emailStep === "input" ? (
                "Send code"
              ) : (
                "Verify"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
