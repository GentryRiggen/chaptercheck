"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import {
  type ApproveUserFormValues,
  approveUserSchema,
} from "@chaptercheck/shared/validations/admin";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
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

interface PendingUser {
  _id: Id<"users">;
  name?: string;
  email: string;
}

interface ApproveUserDialogProps {
  user: PendingUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApproveUserDialog({ user, open, onOpenChange }: ApproveUserDialogProps) {
  const { user: adminUser } = usePermissions();
  const approveUser = useMutation(api.users.mutations.approveUser);
  const allUsers = useQuery(api.users.queries.listAllUsers);

  // Find admin's storage account to use as default
  const adminStorageAccountId = allUsers?.find((u) => u._id === adminUser?._id)?.storageAccountId;

  const form = useForm<ApproveUserFormValues>({
    resolver: zodResolver(approveUserSchema),
    defaultValues: {
      role: "viewer",
      hasPremium: false,
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

  const handleSubmit = async (values: ApproveUserFormValues) => {
    try {
      await approveUser({
        userId: user._id,
        role: values.role,
        hasPremium: values.hasPremium,
        storageAccountId:
          values.storageAccountId && values.storageAccountId !== "none"
            ? (values.storageAccountId as Id<"storageAccounts">)
            : undefined,
      });
      toast.success(`Approved ${user.name || user.email}`);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't approve the user. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve {user.name || user.email}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Approving..." : "Approve User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
