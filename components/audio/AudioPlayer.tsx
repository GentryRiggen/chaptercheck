"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

interface AudioPlayerProps {
  audioFile: Doc<"audioFiles">;
  onDelete?: () => void;
}

export function AudioPlayer({ audioFile, onDelete }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);
  const deleteAudioFile = useMutation(api.audioFiles.mutations.deleteAudioFile);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        setLoading(true);
        const { streamUrl } = await generateStreamUrl({
          r2Key: audioFile.r2Key,
          r2Bucket: audioFile.r2Bucket,
        });
        setAudioUrl(streamUrl);
      } catch (err) {
        console.error("Failed to load audio:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAudio();
  }, [audioFile, generateStreamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this audio file?")) {
      return;
    }

    try {
      await deleteAudioFile({ audioFileId: audioFile._id });
      onDelete?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete audio file");
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-500">Loading audio...</p>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className="bg-red-50 rounded-lg p-4">
        <p className="text-red-600">Failed to load audio file</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{audioFile.fileName}</h4>
          <p className="text-sm text-gray-500">
            {formatFileSize(audioFile.fileSize)} • {audioFile.format.toUpperCase()}
          </p>
        </div>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                  (currentTime / duration) * 100
                }%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
