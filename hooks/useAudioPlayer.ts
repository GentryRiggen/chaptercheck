import { useAction } from "convex/react";
import { useCallback, useState } from "react";

import { type TrackInfo, useAudioPlayerContext } from "@/contexts/AudioPlayerContext";
import { api } from "@/convex/_generated/api";
import { type Doc } from "@/convex/_generated/dataModel";

type AudioFileWithNames = Doc<"audioFiles"> & {
  friendlyName: string | null;
  displayName: string | null;
};

export interface BookInfo {
  bookTitle: string;
  coverImageR2Key?: string;
  seriesName?: string;
  seriesOrder?: number;
  totalParts: number;
}

export function useAudioPlayer(audioFile: AudioFileWithNames, bookInfo: BookInfo) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    isLoading: globalIsLoading,
    currentTime: globalCurrentTime,
    duration: globalDuration,
    play,
    pause,
  } = useAudioPlayerContext();

  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);

  // Check if this track is the currently playing one
  const isCurrentTrack = currentTrack?.audioFileId === audioFile._id;
  const isPlaying = isCurrentTrack && globalIsPlaying;
  const isLoading = isCurrentTrack && globalIsLoading;
  const currentTime = isCurrentTrack ? globalCurrentTime : 0;
  const duration = isCurrentTrack ? globalDuration : 0;

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

  const togglePlayPause = useCallback(async () => {
    if (isCurrentTrack) {
      // This track is current - toggle play/pause
      if (globalIsPlaying) {
        pause();
      } else {
        const trackInfo: TrackInfo = {
          audioFileId: audioFile._id,
          r2Key: audioFile.r2Key,
          r2Bucket: audioFile.r2Bucket,
          displayName: audioFile.displayName || audioFile.fileName,
          bookId: audioFile.bookId,
          bookTitle: bookInfo.bookTitle,
          coverImageR2Key: bookInfo.coverImageR2Key,
          seriesName: bookInfo.seriesName,
          seriesOrder: bookInfo.seriesOrder,
          partNumber: audioFile.partNumber ?? undefined,
          totalParts: bookInfo.totalParts,
        };
        await play(trackInfo);
      }
    } else {
      // Start playing this track
      const trackInfo: TrackInfo = {
        audioFileId: audioFile._id,
        r2Key: audioFile.r2Key,
        r2Bucket: audioFile.r2Bucket,
        displayName: audioFile.displayName || audioFile.fileName,
        bookId: audioFile.bookId,
        bookTitle: bookInfo.bookTitle,
        coverImageR2Key: bookInfo.coverImageR2Key,
        seriesName: bookInfo.seriesName,
        seriesOrder: bookInfo.seriesOrder,
        partNumber: audioFile.partNumber ?? undefined,
        totalParts: bookInfo.totalParts,
      };
      await play(trackInfo);
    }
  }, [
    isCurrentTrack,
    globalIsPlaying,
    pause,
    play,
    audioFile._id,
    audioFile.r2Key,
    audioFile.r2Bucket,
    audioFile.displayName,
    audioFile.fileName,
    audioFile.bookId,
    audioFile.partNumber,
    bookInfo,
  ]);

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    downloadUrl,
    togglePlayPause,
    generateDownloadUrl,
    isCurrentTrack,
  };
}
