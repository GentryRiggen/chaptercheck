"use client";

import { useState, useRef } from "react";
import { useAudioUpload } from "@/hooks/useAudioUpload";
import { Id } from "@/convex/_generated/dataModel";

interface AudioUploadProps {
  bookId: Id<"books">;
  onUploadComplete: () => void;
}

export function AudioUpload({ bookId, onUploadComplete }: AudioUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAudio, uploading, progress, error } = useAudioUpload(bookId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a"];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|m4a|m4b)$/i)) {
        alert("Please select a valid audio file (MP3 or M4A)");
        return;
      }

      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("File size must be less than 500MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const success = await uploadAudio(selectedFile);
    if (success) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadComplete();
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Audio File</h3>

      {!selectedFile ? (
        <div>
          <label className="block">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/mp4,audio/m4a,.mp3,.m4a,.m4b"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: MP3, M4A (max 500MB)
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {uploading && (
              <div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Uploading... {Math.round(progress)}%
                </p>
              </div>
            )}

            {error && (
              <div className="mt-2 text-sm text-red-600">{error}</div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            {!uploading && (
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
