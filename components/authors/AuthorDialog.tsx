"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthorForm } from "./AuthorForm";
import type { AuthorFormValues } from "@/lib/validations/author";

interface AuthorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthorDialog({ open, onOpenChange }: AuthorDialogProps) {
  const createAuthor = useMutation(api.authors.mutations.createAuthor);

  const handleSubmit = async (values: AuthorFormValues) => {
    await createAuthor({
      name: values.name,
      bio: values.bio || undefined,
      imageR2Key: values.imageR2Key,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Author</DialogTitle>
        </DialogHeader>
        <AuthorForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create Author"
        />
      </DialogContent>
    </Dialog>
  );
}
