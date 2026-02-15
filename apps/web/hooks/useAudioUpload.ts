import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";

export interface UploadOptions {
  partNumber: number;
  onProgress?: (progress: number) => void;
}

export const useAudioUpload = (bookId: Id<"books">) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useAction(api.audioFiles.actions.generateUploadUrl);
  const createAudioFile = useMutation(api.audioFiles.mutations.createAudioFile);

  const uploadAudio = async (file: File, options: UploadOptions) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    const updateProgress = (value: number) => {
      setProgress(value);
      options.onProgress?.(value);
    };

    try {
      // Step 1: Get presigned URL from Convex (also creates storage account if needed)
      const { uploadUrl, r2Key, r2Bucket, storageAccountId } = await generateUploadUrl({
        bookId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      });

      // Step 2: Upload to R2 using XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            updateProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Step 3: Store metadata in Convex
      const format = file.name.split(".").pop() || "unknown";

      await createAudioFile({
        bookId,
        fileName: file.name,
        fileSize: file.size,
        format,
        r2Key,
        r2Bucket,
        storageAccountId,
        partNumber: options.partNumber,
        duration: 0, // TODO: Extract actual duration from audio file
      });

      updateProgress(100);
      setUploading(false);
      return true;
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      return false;
    }
  };

  return { uploadAudio, uploading, progress, error };
};
