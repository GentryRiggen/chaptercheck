import { api } from "@chaptercheck/convex-backend/_generated/api";
import imageCompression from "browser-image-compression";
import { useAction } from "convex/react";
import { useState } from "react";

interface UseImageUploadOptions {
  path: string; // e.g., "authors", "books"
}

export const useImageUpload = ({ path }: UseImageUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useAction(api.images.actions.generateUploadUrl);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Compress and optimize the image
      setProgress(10);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.2, // 200KB target
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/webp",
      });

      // Update filename to .webp extension
      const webpFileName = file.name.replace(/\.[^.]+$/, ".webp");
      const optimizedFile = new File([compressedFile], webpFileName, {
        type: "image/webp",
      });

      setProgress(30);

      // Step 2: Get presigned URL from Convex
      const { uploadUrl, r2Key } = await generateUploadUrl({
        fileName: optimizedFile.name,
        fileSize: optimizedFile.size,
        contentType: optimizedFile.type,
        path,
      });

      setProgress(40);

      // Step 3: Upload to R2 using XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            // Scale progress from 40% to 100%
            const uploadProgress = (e.loaded / e.total) * 60 + 40;
            setProgress(uploadProgress);
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
        xhr.setRequestHeader("Content-Type", optimizedFile.type);
        xhr.send(optimizedFile);
      });

      setProgress(100);
      setUploading(false);
      return r2Key;
    } catch (err) {
      console.error("Image upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      return null;
    }
  };

  return { uploadImage, uploading, progress, error };
};
