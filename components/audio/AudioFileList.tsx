"use client";

import { useMutation } from "convex/react";
import { ArrowDown, ArrowUp, Download, GripVertical, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AudioFileDeleteDialog } from "@/components/audio/AudioFileDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { type Doc, type Id } from "@/convex/_generated/dataModel";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

type AudioFileWithNames = Doc<"audioFiles"> & {
  friendlyName: string | null;
  displayName: string | null;
};

interface AudioFileListProps {
  bookId: Id<"books">;
  audioFiles: AudioFileWithNames[];
  onPlayingChange?: (title: string | null) => void;
}

export function AudioFileList({ bookId, audioFiles, onPlayingChange }: AudioFileListProps) {
  const [isReordering, setIsReordering] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<AudioFileWithNames | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<Id<"audioFiles"> | null>(null);

  // Notify parent when playing state changes
  useEffect(() => {
    if (currentlyPlayingId) {
      const playingFile = audioFiles.find((f) => f._id === currentlyPlayingId);
      onPlayingChange?.(playingFile?.displayName || playingFile?.fileName || null);
    } else {
      onPlayingChange?.(null);
    }
  }, [currentlyPlayingId, audioFiles, onPlayingChange]);

  const handlePlayingChange = (fileId: Id<"audioFiles">, isPlaying: boolean) => {
    setCurrentlyPlayingId(isPlaying ? fileId : null);
  };

  const reorderAudioFiles = useMutation(api.audioFiles.mutations.reorderAudioFiles);

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...audioFiles];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    try {
      await reorderAudioFiles({
        bookId,
        orderedFileIds: newOrder.map((f) => f._id),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder files");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === audioFiles.length - 1) return;
    const newOrder = [...audioFiles];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    try {
      await reorderAudioFiles({
        bookId,
        orderedFileIds: newOrder.map((f) => f._id),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder files");
    }
  };

  const handleDeleteClick = (file: AudioFileWithNames) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Audio Files</CardTitle>
            {audioFiles.length > 1 && (
              <Button
                variant={isReordering ? "default" : "outline"}
                size="sm"
                onClick={() => setIsReordering(!isReordering)}
              >
                <GripVertical className="mr-1 h-4 w-4" />
                {isReordering ? "Done" : "Reorder"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-3">
          {audioFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audio files yet. Upload one above to get started.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {audioFiles.map((audioFile, index) => (
                <AudioFileRow
                  key={audioFile._id}
                  audioFile={audioFile}
                  index={index}
                  totalFiles={audioFiles.length}
                  isReordering={isReordering}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onDelete={() => handleDeleteClick(audioFile)}
                  onPlayingChange={(isPlaying) => handlePlayingChange(audioFile._id, isPlaying)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {fileToDelete && (
        <AudioFileDeleteDialog
          audioFileId={fileToDelete._id}
          fileName={fileToDelete.fileName}
          displayName={fileToDelete.displayName}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDeleted={() => setFileToDelete(null)}
        />
      )}
    </>
  );
}

interface AudioFileRowProps {
  audioFile: AudioFileWithNames;
  index: number;
  totalFiles: number;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onPlayingChange: (isPlaying: boolean) => void;
}

function AudioFileRow({
  audioFile,
  index,
  totalFiles,
  isReordering,
  onMoveUp,
  onMoveDown,
  onDelete,
  onPlayingChange,
}: AudioFileRowProps) {
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    downloadUrl,
    togglePlayPause,
    generateDownloadUrl,
  } = useAudioPlayer(audioFile);

  // Notify parent when playing state changes
  useEffect(() => {
    onPlayingChange(isPlaying);
  }, [isPlaying, onPlayingChange]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const handleDownload = async () => {
    let url = downloadUrl;
    if (!url) {
      url = await generateDownloadUrl();
    }
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
      {isReordering && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalFiles - 1}
            className="rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Part number badge */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
        {audioFile.partNumber ?? index + 1}
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {audioFile.displayName || audioFile.fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(audioFile.fileSize)} • {audioFile.format.toUpperCase()}
        </p>
        {audioFile.displayName && audioFile.displayName !== audioFile.fileName && (
          <p className="truncate text-[10px] text-muted-foreground/60">{audioFile.fileName}</p>
        )}
      </div>

      {/* Play/pause controls */}
      {!isReordering && (
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlayPause}
                className="h-8 w-8 rounded-full"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              {duration > 0 && (
                <span className="min-w-[80px] text-xs text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDownload}
          className="h-8 w-8"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 text-destructive hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
