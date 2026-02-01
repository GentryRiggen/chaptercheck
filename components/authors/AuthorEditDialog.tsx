"use client";

import { useMutation } from "convex/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { useImageUrl } from "@/hooks/useImageUrl";
import type { AuthorFormValues } from "@/lib/validations/author";

import { AuthorForm } from "./AuthorForm";

interface Author {
  _id: Id<"authors">;
  name: string;
  bio?: string;
  imageR2Key?: string;
}

interface AuthorEditDialogProps {
  author: Author;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthorEditDialog({ author, open, onOpenChange }: AuthorEditDialogProps) {
  const updateAuthor = useMutation(api.authors.mutations.updateAuthor);
  const { imageUrl } = useImageUrl(author.imageR2Key);

  const handleSubmit = async (values: AuthorFormValues) => {
    await updateAuthor({
      authorId: author._id,
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
          <DialogTitle>Edit Author</DialogTitle>
        </DialogHeader>
        <AuthorForm
          initialValues={{
            name: author.name,
            bio: author.bio,
            imageR2Key: author.imageR2Key,
          }}
          initialImageUrl={imageUrl || undefined}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
