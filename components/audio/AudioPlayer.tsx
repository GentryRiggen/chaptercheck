"use client";

import { useAction, useMutation } from "convex/react";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { type Doc } from "@/convex/_generated/dataModel";

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
    try {
      await deleteAudioFile({ audioFileId: audioFile._id });
      toast.success("Audio file deleted");
      onDelete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete audio file");
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
      <Card className="p-4">
        <p className="text-muted-foreground">Loading audio...</p>
      </Card>
    );
  }

  if (!audioUrl) {
    return (
      <Card className="bg-destructive/10 p-4">
        <p className="text-destructive">Failed to load audio file</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{audioFile.fileName}</h4>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(audioFile.fileSize)} • {audioFile.format.toUpperCase()}
          </p>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button size="icon" onClick={togglePlayPause} className="flex-shrink-0 rounded-full">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
