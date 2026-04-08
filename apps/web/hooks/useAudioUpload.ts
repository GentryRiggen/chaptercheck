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
      // .m4b files are MP4 containers (same as .m4a) but browsers report
      // them as audio/x-m4b which backends may not recognize.
      const contentType = file.name.match(/\.m4b$/i) ? "audio/mp4" : file.type;

      // Step 1: Get presigned URL from Convex (also creates storage account if needed)
      const { uploadUrl, r2Key, r2Bucket, storageAccountId } = await generateUploadUrl({
        bookId,
        fileName: file.name,
        fileSize: file.size,
        contentType,
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
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
      });

      // Step 3: Extract frame-accurate duration using Web Audio API.
      // decodeAudioData reads actual PCM frames rather than relying on
      // potentially inaccurate MP3 Xing/LAME headers. Skip for very large
      // files (>200MB) to avoid excessive memory usage during decoding.
      let duration = 0;
      if (file.size < 200 * 1024 * 1024) {
        try {
          const audioContext = new AudioContext();
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          duration = audioBuffer.duration;
          await audioContext.close();
        } catch {
          // Fall back to 0; backend will backfill from player-reported duration
        }
      }

      // Step 4: Store metadata in Convex
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
        duration,
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
