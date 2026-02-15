"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileAudio,
  GripVertical,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAudioUpload } from "@/hooks/useAudioUpload";
import { cn } from "@/lib/utils";

interface AudioUploadProps {
  bookId: Id<"books">;
  existingFileCount?: number; // Number of existing audio files for this book
  onUploadComplete: () => void;
}

interface FileWithStatus {
  file: File;
  id: string;
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  error?: string;
}

const MAX_FILE_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB
const VALID_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a"];
const VALID_EXTENSIONS = /\.(mp3|m4a|m4b)$/i;
const MAX_CONCURRENT_UPLOADS = 3;

export function AudioUpload({ bookId, existingFileCount = 0, onUploadComplete }: AudioUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAudio } = useAudioUpload(bookId);

  const validateFile = (file: File): string | null => {
    if (!VALID_TYPES.includes(file.type) && !file.name.match(VALID_EXTENSIONS)) {
      return `${file.name}: Invalid file type. Please select MP3 or M4A files.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 1.5GB.`;
    }
    return null;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const filesToAdd: FileWithStatus[] = [];
      const errors: string[] = [];

      Array.from(newFiles).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          // Check for duplicates
          const isDuplicate = files.some(
            (f) => f.file.name === file.name && f.file.size === file.size
          );
          if (!isDuplicate) {
            filesToAdd.push({
              file,
              id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
              status: "pending",
              progress: 0,
            });
          }
        }
      });

      if (errors.length > 0) {
        errors.forEach((error) => toast.error(error));
      }

      if (filesToAdd.length > 0) {
        setFiles((prev) => [...prev, ...filesToAdd]);
      }
    },
    [files]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  // Reorder functions
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles;
    });
  };

  const handleMoveDown = (index: number) => {
    setFiles((prev) => {
      if (index >= prev.length - 1) return prev;
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      return newFiles;
    });
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    // Exit reorder mode when uploading
    setIsReordering(false);
    setIsUploading(true);
    let successCount = 0;

    // Get the indices of pending files in the main files array to determine part numbers
    const pendingIndices = files
      .map((f, i) => ({ file: f, index: i }))
      .filter((item) => item.file.status === "pending");

    // Upload a single file and return whether it succeeded
    const uploadSingleFile = async (
      fileWithStatus: FileWithStatus,
      pendingIndex: number
    ): Promise<boolean> => {
      // Calculate part number: existing files + position in pending files (1-based)
      const partNumber = existingFileCount + pendingIndex + 1;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithStatus.id ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      );

      try {
        const success = await uploadAudioWithProgress(
          fileWithStatus.file,
          fileWithStatus.id,
          partNumber
        );

        if (success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithStatus.id ? { ...f, status: "complete" as const, progress: 100 } : f
            )
          );
          return true;
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithStatus.id
                ? { ...f, status: "error" as const, error: "Upload failed" }
                : f
            )
          );
          return false;
        }
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithStatus.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : f
          )
        );
        return false;
      }
    };

    // Process files with concurrency limit, tracking their pending index
    const results = await processWithConcurrency(
      pendingIndices,
      ({ file, index }) => {
        // Find the pending index (0-based position among pending files)
        const pendingIdx = pendingIndices.findIndex((p) => p.index === index);
        return uploadSingleFile(file, pendingIdx);
      },
      MAX_CONCURRENT_UPLOADS
    );
    successCount = results.filter(Boolean).length;

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
      onUploadComplete();
    }
  };

  // Helper to process items with a concurrency limit
  const processWithConcurrency = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        results[index] = await processor(items[index]);
      }
    };

    // Start workers up to concurrency limit
    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);
    return results;
  };

  const uploadAudioWithProgress = async (
    file: File,
    fileId: string,
    partNumber: number
  ): Promise<boolean> => {
    const onProgress = (progress: number) => {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress } : f)));
    };

    return await uploadAudio(file, { partNumber, onProgress });
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "complete"));
  };

  const clearAll = () => {
    if (!isUploading) {
      setFiles([]);
      setIsReordering(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const pendingCount = pendingFiles.length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const completedCount = files.filter((f) => f.status === "complete").length;
  const hasFiles = files.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Audio Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/mpeg,audio/mp3,audio/mp4,audio/m4a,.mp3,.m4a,.m4b"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">
            {isDragOver ? "Drop files here" : "Drag & drop audio files here"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
          <p className="mt-2 text-xs text-muted-foreground">MP3, M4A, M4B (max 1.5GB per file)</p>
        </div>

        {/* File List */}
        {hasFiles && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                {pendingCount > 1 && !isUploading && (
                  <Button
                    variant={isReordering ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsReordering(!isReordering)}
                  >
                    <GripVertical className="mr-1 h-4 w-4" />
                    {isReordering ? "Done" : "Reorder"}
                  </Button>
                )}
                {completedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted} disabled={isUploading}>
                    Clear completed
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
                  Clear all
                </Button>
              </div>
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2">
              {files.map((fileWithStatus, index) => {
                const isPending = fileWithStatus.status === "pending";
                // Calculate display part number for pending files
                const pendingIndex = pendingFiles.findIndex((f) => f.id === fileWithStatus.id);
                const displayPartNumber =
                  isPending && pendingIndex !== -1
                    ? existingFileCount + pendingIndex + 1
                    : undefined;

                return (
                  <div
                    key={fileWithStatus.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md p-2 transition-colors",
                      fileWithStatus.status === "complete" && "bg-green-500/10",
                      fileWithStatus.status === "error" && "bg-destructive/10"
                    )}
                  >
                    {/* Reorder Controls */}
                    {isReordering && isPending && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || files[index - 1]?.status !== "pending"}
                          className="rounded p-0.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={
                            index >= files.length - 1 || files[index + 1]?.status !== "pending"
                          }
                          className="rounded p-0.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Part Number Badge */}
                    {displayPartNumber !== undefined && (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                        {displayPartNumber}
                      </div>
                    )}

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {fileWithStatus.status === "complete" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : fileWithStatus.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : fileWithStatus.status === "uploading" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <FileAudio className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{fileWithStatus.file.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileWithStatus.file.size)}
                        </p>
                        {fileWithStatus.status === "uploading" && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(fileWithStatus.progress)}%
                          </span>
                        )}
                        {fileWithStatus.status === "error" && fileWithStatus.error && (
                          <span className="text-xs text-destructive">{fileWithStatus.error}</span>
                        )}
                      </div>
                      {fileWithStatus.status === "uploading" && (
                        <Progress value={fileWithStatus.progress} className="mt-1 h-1" />
                      )}
                    </div>

                    {/* Remove Button */}
                    {isPending && !isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileWithStatus.id)}
                        className="h-6 w-6 flex-shrink-0 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {(pendingCount > 0 || isUploading) && (
          <Button onClick={handleUploadAll} disabled={isUploading} className="w-full">
            {isUploading
              ? `Uploading ${uploadingCount} of ${uploadingCount + pendingCount} remaining...`
              : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
