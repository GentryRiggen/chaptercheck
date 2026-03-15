"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Globe, Lock, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ENTRY_TYPES, type EntryType, getEntryTypeConfig } from "./NoteEntryType";

const NOTE_TEXT_MAX = 4000;

const noteFormSchema = z
  .object({
    entryType: z.enum(ENTRY_TYPES),
    noteText: z
      .string()
      .min(1, "Note text is required")
      .max(NOTE_TEXT_MAX, `Must be ${NOTE_TEXT_MAX} characters or fewer`),
    sourceText: z.string().max(NOTE_TEXT_MAX).optional(),
    isPublic: z.boolean(),
    tagIds: z.array(z.string()),
  })
  .refine(
    (data) => {
      if (data.entryType === "quote" && data.sourceText) {
        return data.sourceText.trim().length <= NOTE_TEXT_MAX;
      }
      return true;
    },
    { message: `Source text must be ${NOTE_TEXT_MAX} characters or fewer`, path: ["sourceText"] }
  );

type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteInitialData {
  noteId: Id<"bookNotes">;
  entryType?: string;
  noteText?: string | null;
  sourceText?: string | null;
  isPublic?: boolean | null;
  tags?: Array<{ _id: Id<"memoryTags">; name: string }>;
}

interface FreeformNoteComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: Id<"books">;
  /** Pass to enter edit mode */
  initialData?: NoteInitialData;
}

export function FreeformNoteComposerDialog({
  open,
  onOpenChange,
  bookId,
  initialData,
}: FreeformNoteComposerDialogProps) {
  const isEditing = !!initialData;

  const createNote = useMutation(api.bookNotes.mutations.createNote);
  const updateNote = useMutation(api.bookNotes.mutations.updateNote);
  const createTag = useMutation(api.bookNotes.mutations.createTag);

  const memoryTags = useQuery(api.bookNotes.queries.getMyMemoryTags, open ? {} : "skip");

  const [newTagInput, setNewTagInput] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      entryType: "note",
      noteText: "",
      sourceText: "",
      isPublic: false,
      tagIds: [],
    },
  });

  const entryType = form.watch("entryType");
  const selectedTagIds = form.watch("tagIds");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        entryType: (initialData?.entryType as EntryType) ?? "note",
        noteText: initialData?.noteText ?? "",
        sourceText: initialData?.sourceText ?? "",
        isPublic: initialData?.isPublic ?? false,
        tagIds: initialData?.tags?.map((t) => t._id) ?? [],
      });
      setNewTagInput("");
    }
  }, [open, initialData, form]);

  const handleCreateTag = async () => {
    const name = newTagInput.trim();
    if (!name) return;

    setIsCreatingTag(true);
    try {
      const tagId = await createTag({ name });
      const current = form.getValues("tagIds");
      if (!current.includes(tagId)) {
        form.setValue("tagIds", [...current, tagId]);
      }
      setNewTagInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tag");
    } finally {
      setIsCreatingTag(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const current = form.getValues("tagIds");
    if (current.includes(tagId)) {
      form.setValue(
        "tagIds",
        current.filter((id) => id !== tagId)
      );
    } else {
      form.setValue("tagIds", [...current, tagId]);
    }
  };

  const handleSubmit = async (values: NoteFormData) => {
    try {
      if (isEditing && initialData) {
        await updateNote({
          noteId: initialData.noteId,
          entryType: values.entryType,
          noteText: values.noteText,
          sourceText: values.entryType === "quote" ? values.sourceText || undefined : undefined,
          isPublic: values.isPublic,
          tagIds: values.tagIds as Id<"memoryTags">[],
        });
        toast.success("Note updated");
      } else {
        await createNote({
          bookId,
          entryType: values.entryType,
          noteText: values.noteText,
          sourceText: values.entryType === "quote" ? values.sourceText || undefined : undefined,
          isPublic: values.isPublic,
          tagIds: values.tagIds as Id<"memoryTags">[],
        });
        toast.success("Note created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note");
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.stopPropagation();
    form.handleSubmit(handleSubmit)(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Note" : "Add Note"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your note for this book."
              : "Create a freeform note for this book."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-5">
            {/* Entry Type */}
            <FormField
              control={form.control}
              name="entryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENTRY_TYPES.map((type) => {
                        const config = getEntryTypeConfig(type);
                        const Icon = config.icon;
                        return (
                          <SelectItem key={type} value={type}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {config.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note Text */}
            <FormField
              control={form.control}
              name="noteText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{entryType === "quote" ? "Your thoughts" : "Note"}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        entryType === "quote"
                          ? "Your thoughts about this quote..."
                          : "Write your note..."
                      }
                      rows={4}
                      maxLength={NOTE_TEXT_MAX}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length ?? 0} / {NOTE_TEXT_MAX} characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source Text (only for quotes) */}
            {entryType === "quote" && (
              <FormField
                control={form.control}
                name="sourceText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quote text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="The exact quote from the book..."
                        rows={3}
                        maxLength={NOTE_TEXT_MAX}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The original text from the book (displayed in italics).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {memoryTags?.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag._id);
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => toggleTag(tag._id)}
                      className={
                        isSelected
                          ? "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors"
                          : "inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
                      }
                    >
                      {tag.name}
                      {isSelected && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
                {memoryTags?.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tags yet. Create one below.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="New tag name..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateTag();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCreateTag()}
                  disabled={!newTagInput.trim() || isCreatingTag}
                  className="shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>

            {/* Public toggle */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border bg-muted/30 p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="flex-1 space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      {field.value ? (
                        <Globe className="h-4 w-4 text-primary" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      Share publicly
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {field.value
                        ? "This note will be visible on your public profile."
                        : "This note is private. Only you can see it."}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Note"
                    : "Create Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
