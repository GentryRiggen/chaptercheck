"use client";

import { useMutation } from "convex/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import type { AuthorFormValues } from "@/lib/validations/author";

import { AuthorForm } from "./AuthorForm";

interface AuthorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (authorId: Id<"authors">) => void;
  initialName?: string;
}

export function AuthorDialog({ open, onOpenChange, onCreated, initialName }: AuthorDialogProps) {
  const createAuthor = useMutation(api.authors.mutations.createAuthor);

  const handleSubmit = async (values: AuthorFormValues) => {
    const authorId = await createAuthor({
      name: values.name,
      bio: values.bio || undefined,
      imageR2Key: values.imageR2Key,
    });
    onOpenChange(false);
    onCreated?.(authorId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Add New Author</DialogTitle>
        </DialogHeader>
        <AuthorForm
          key={open ? `open-${initialName || ""}` : "closed"}
          initialValues={initialName ? { name: initialName } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create Author"
        />
      </DialogContent>
    </Dialog>
  );
}
