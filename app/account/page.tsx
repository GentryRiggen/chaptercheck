"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Eye, EyeOff, HardDrive, Loader2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatBytes } from "@/lib/utils";
import { type AccountSettingsFormValues, accountSettingsSchema } from "@/lib/validations/auth";

// 2 TB storage limit (display only)
const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024 * 1024;

export default function AccountPage() {
  usePageTitle("Account");
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const storageStats = useQuery(api.storageAccounts.queries.getStorageStats);
  const currentUserData = useQuery(api.users.queries.getCurrentUserWithPermissions);
  const updateProfilePrivacy = useMutation(api.users.mutations.updateProfilePrivacy);

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

  // Profile Card Component
  const ProfileCard = (
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
              {profileSuccess && <span className="text-sm text-green-600">Profile updated!</span>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  // Email Card Component
  const EmailCard = (
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
  );

  // Sign Out Card Component
  const SignOutCard = (
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
  );

  // Privacy Card Component
  const isProfilePrivate = currentUserData?.isProfilePrivate ?? false;

  const handlePrivacyToggle = async (checked: boolean) => {
    try {
      await updateProfilePrivacy({ isProfilePrivate: checked });
    } catch (err) {
      console.error("Failed to update privacy setting:", err);
    }
  };

  const PrivacyCard = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProfilePrivate ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          Profile Privacy
        </CardTitle>
        <CardDescription>Control who can see your profile and reading activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="profile-privacy" className="text-sm font-medium">
              Private profile
            </label>
            <p className="text-xs text-muted-foreground">
              When enabled, only you can see your profile and library
            </p>
          </div>
          <Switch
            id="profile-privacy"
            checked={isProfilePrivate}
            onCheckedChange={handlePrivacyToggle}
            disabled={currentUserData === undefined}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          You can also mark individual books as private when marking them as read.
        </p>
      </CardContent>
    </Card>
  );

  // Storage Usage Card Component
  const StorageCard = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Usage
        </CardTitle>
        <CardDescription>Your audiobook library storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {storageStats === undefined ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading storage info...</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatBytes(storageStats.totalBytesUsed)} of {formatBytes(STORAGE_LIMIT_BYTES)}
                </span>
                <span className="font-medium">
                  {((storageStats.totalBytesUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={(storageStats.totalBytesUsed / STORAGE_LIMIT_BYTES) * 100}
                className="h-2"
              />
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">Total files</span>
              <span className="font-medium">{storageStats.fileCount.toLocaleString()}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl p-4 pb-24 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>

        {/* Mobile Layout - Tabbed Interface */}
        <div className="block md:hidden">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-6">
              {ProfileCard}
              {EmailCard}
              {PrivacyCard}
              {SignOutCard}
            </TabsContent>
            <TabsContent value="storage" className="space-y-6">
              {StorageCard}
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop Layout - Two Column */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-6">
          {/* Left Column - Account Cards */}
          <div className="space-y-6">
            {ProfileCard}
            {EmailCard}
            {PrivacyCard}
            {SignOutCard}
          </div>

          {/* Right Column - Storage Card */}
          <div className="space-y-6">{StorageCard}</div>
        </div>
      </div>

      {/* Email Change Dialog */}
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
