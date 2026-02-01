import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import { type Doc } from "@/convex/_generated/dataModel";

type AudioFileWithNames = Doc<"audioFiles"> & {
  friendlyName: string | null;
  displayName: string | null;
};

export function useAudioPlayer(audioFile: AudioFileWithNames) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);

  // Load audio on first play
  const loadAudio = useCallback(async () => {
    if (audioUrl) return audioUrl;

    setIsLoading(true);
    try {
      const { streamUrl } = await generateStreamUrl({
        r2Key: audioFile.r2Key,
        r2Bucket: audioFile.r2Bucket,
      });
      setAudioUrl(streamUrl);
      return streamUrl;
    } catch (err) {
      console.error("Failed to load audio:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [audioFile.r2Key, audioFile.r2Bucket, audioUrl, generateStreamUrl]);

  // Generate download URL with friendly filename
  const generateDownloadUrl = useCallback(async () => {
    if (downloadUrl) return downloadUrl;

    try {
      const { streamUrl } = await generateStreamUrl({
        r2Key: audioFile.r2Key,
        r2Bucket: audioFile.r2Bucket,
        downloadFileName: audioFile.friendlyName || audioFile.fileName,
      });
      setDownloadUrl(streamUrl);
      return streamUrl;
    } catch (err) {
      console.error("Failed to generate download URL:", err);
      return null;
    }
  }, [
    audioFile.r2Key,
    audioFile.r2Bucket,
    audioFile.friendlyName,
    audioFile.fileName,
    downloadUrl,
    generateStreamUrl,
  ]);

  // Create and manage audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) {
      // First time playing - load the audio
      const url = await loadAudio();
      if (!url) return;

      // Wait for the audio element to be created in the useEffect
      setTimeout(() => {
        audioRef.current?.play();
      }, 100);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying, loadAudio]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    audioUrl,
    downloadUrl,
    togglePlayPause,
    seek,
    loadAudio,
    generateDownloadUrl,
  };
}
