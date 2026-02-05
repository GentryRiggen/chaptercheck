"use client";

import { useMutation } from "convex/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import type { GenreFormValues } from "@/lib/validations/genre";

import { GenreForm } from "./GenreForm";

interface GenreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (genreId: Id<"genres">) => void;
  initialName?: string;
}

export function GenreDialog({ open, onOpenChange, onCreated, initialName }: GenreDialogProps) {
  const createGenre = useMutation(api.genres.mutations.createGenre);

  const handleSubmit = async (values: GenreFormValues) => {
    const genreId = await createGenre({
      name: values.name,
    });
    onOpenChange(false);
    onCreated?.(genreId);
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
          <DialogTitle>Add New Genre</DialogTitle>
        </DialogHeader>
        <GenreForm
          key={open ? `open-${initialName || ""}` : "closed"}
          initialValues={initialName ? { name: initialName } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create Genre"
        />
      </DialogContent>
    </Dialog>
  );
}
