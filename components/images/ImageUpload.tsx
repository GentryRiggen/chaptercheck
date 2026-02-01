"use client";

import { User, X } from "lucide-react";
import { useCallback,useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useImageUpload } from "@/hooks/useImageUpload";

interface ImageUploadProps {
  path: string;
  value?: string; // Current R2 key
  previewUrl?: string; // URL to display for existing image
  onChange: (r2Key: string | undefined) => void;
}

export function ImageUpload({ path, previewUrl, onChange }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const { uploadImage, uploading, progress, error } = useImageUpload({ path });

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show local preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);

      // Upload the image
      const r2Key = await uploadImage(file);
      if (r2Key) {
        onChange(r2Key);
      } else {
        // Upload failed, clear preview
        setPreview(previewUrl || null);
        URL.revokeObjectURL(localPreview);
      }
    },
    [uploadImage, onChange, previewUrl]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {preview || previewUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview || previewUrl || ""}
            alt="Preview"
            className="h-32 w-32 rounded-lg border object-cover"
          />
          {!uploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-muted">
          <div className="flex flex-col items-center justify-center pb-6 pt-5">
            <User className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Upload photo</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}

      {uploading && (
        <div className="w-32 space-y-1">
          <Progress value={progress} />
          <p className="text-center text-xs text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {(preview || previewUrl) && !uploading && (
        <label className="cursor-pointer">
          <span className="text-sm text-blue-600 hover:underline">Change photo</span>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
