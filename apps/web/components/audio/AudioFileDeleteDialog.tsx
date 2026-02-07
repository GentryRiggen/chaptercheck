"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { AlertTriangle, Music } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AudioFileDeleteDialogProps {
  audioFileId: Id<"audioFiles">;
  fileName: string;
  displayName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function AudioFileDeleteDialog({
  audioFileId,
  fileName,
  displayName,
  open,
  onOpenChange,
  onDeleted,
}: AudioFileDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const deleteAudioFile = useMutation(api.audioFiles.mutations.deleteAudioFile);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAudioFile({ audioFileId });
      toast.success("Audio file deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete audio file");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Audio File
          </DialogTitle>
          <DialogDescription>Are you sure you want to delete this audio file?</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{displayName || fileName}</span>
          </div>

          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
