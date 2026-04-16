"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import {
  type CreateUserFormValues,
  createUserSchema,
} from "@chaptercheck/shared/validations/admin";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/contexts/PermissionsContext";

import { StorageAccountSelect } from "./StorageAccountSelect";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { user: adminUser } = usePermissions();
  const adminUpdateUser = useMutation(api.users.mutations.adminUpdateUser);
  const allUsers = useQuery(api.users.queries.listAllUsers);
  const [pendingClerkId, setPendingClerkId] = useState<string | null>(null);

  // Find admin's storage account to use as default
  const adminStorageAccountId = allUsers?.find((u) => u._id === adminUser?._id)?.storageAccountId;

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "viewer",
      hasPremium: true,
      messagingEnabled: true,
      storageAccountId: "",
    },
  });

  // Set default storage account when admin data loads
  const hasSetDefault = useRef(false);
  useEffect(() => {
    if (adminStorageAccountId && open && !hasSetDefault.current) {
      form.setValue("storageAccountId", adminStorageAccountId);
      hasSetDefault.current = true;
    }
  }, [adminStorageAccountId, open, form]);

  // Reset default flag when dialog closes
  useEffect(() => {
    if (!open) {
      hasSetDefault.current = false;
    }
  }, [open]);

  // Timeout: if webhook doesn't sync within 30s, give up
  useEffect(() => {
    if (!pendingClerkId) return;
    const timeout = setTimeout(() => {
      setPendingClerkId(null);
      toast.error(
        "Sync timed out. The user was created in Clerk but hasn't appeared yet. Try refreshing."
      );
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [pendingClerkId]);

  // Wait for user to appear in Convex after Clerk creation, then configure
  useEffect(() => {
    if (!pendingClerkId || !allUsers) return;

    const newUser = allUsers.find((u) => u.clerkId === pendingClerkId);
    if (newUser) {
      const values = form.getValues();
      adminUpdateUser({
        userId: newUser._id,
        role: values.role,
        hasPremium: values.hasPremium,
        messagingEnabled: values.messagingEnabled,
        storageAccountId:
          values.storageAccountId && values.storageAccountId !== "none"
            ? (values.storageAccountId as Id<"storageAccounts">)
            : undefined,
      })
        .then(() => {
          toast.success(`User ${values.firstName} created successfully`);
          setPendingClerkId(null);
          form.reset();
          onOpenChange(false);
        })
        .catch(() => {
          toast.error("User created but couldn't be configured. Please try again.");
          setPendingClerkId(null);
        });
    }
  }, [pendingClerkId, allUsers, adminUpdateUser, form, onOpenChange]);

  const handleSubmit = async (values: CreateUserFormValues) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName || undefined,
          email: values.email,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        toast.error("A user with this email already exists");
        return;
      }

      if (!response.ok) {
        toast.error("Couldn't create the user. Please try again.");
        return;
      }

      // Wait for Clerk webhook to create user in Convex
      toast.info("User created in Clerk, waiting for sync...");
      setPendingClerkId(data.clerkId);
    } catch {
      toast.error("Couldn't create the user. Please try again.");
    }
  };

  const isWaitingForSync = pendingClerkId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasPremium"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium">Premium Access</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="messagingEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium">Direct Messaging</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storageAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Account</FormLabel>
                  <FormControl>
                    <StorageAccountSelect value={field.value} onValueChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isWaitingForSync}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={form.formState.isSubmitting || isWaitingForSync}
              >
                {isWaitingForSync ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : form.formState.isSubmitting ? (
                  "Creating..."
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
