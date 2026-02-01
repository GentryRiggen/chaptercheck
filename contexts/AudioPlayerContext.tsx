"use client";

import { useAction } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";

export interface TrackInfo {
  audioFileId: Id<"audioFiles">;
  r2Key: string;
  r2Bucket: string;
  displayName: string;
  bookId: Id<"books">;
  bookTitle: string;
  coverImageR2Key?: string;
  seriesName?: string;
  seriesOrder?: number;
  partNumber?: number;
  totalParts: number;
}

interface AudioPlayerContextValue {
  // Current track info
  currentTrack: TrackInfo | null;

  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;

  // Expanded state
  isExpanded: boolean;

  // Controls
  play: (track: TrackInfo) => Promise<void>;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setPlaybackRate: (rate: number) => void;
  expand: () => void;
  collapse: () => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const PLAYBACK_RATE_KEY = "chaptercheck-playback-rate";
const DEFAULT_SKIP_SECONDS = 15;

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);

  // Load playback rate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PLAYBACK_RATE_KEY);
    if (stored) {
      const rate = parseFloat(stored);
      if (!isNaN(rate) && rate >= 0.5 && rate <= 3) {
        setPlaybackRateState(rate);
      }
    }
  }, []);

  // Track playback rate in a ref so we can access it without causing re-renders
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  // Create and manage audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRateRef.current;
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);

    // Auto-play when audio is loaded
    audio.play().catch((err) => {
      console.error("Auto-play failed:", err);
    });

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Update playback rate on audio element when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const play = useCallback(
    async (track: TrackInfo) => {
      // If same track, just resume
      if (currentTrack?.audioFileId === track.audioFileId && audioRef.current) {
        audioRef.current.play();
        return;
      }

      // Load new track
      setIsLoading(true);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(0);

      try {
        const { streamUrl } = await generateStreamUrl({
          r2Key: track.r2Key,
          r2Bucket: track.r2Bucket,
        });
        setAudioUrl(streamUrl);
      } catch (err) {
        console.error("Failed to load audio:", err);
        setIsLoading(false);
      }
    },
    [currentTrack?.audioFileId, generateStreamUrl]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipForward = useCallback(
    (seconds = DEFAULT_SKIP_SECONDS) => {
      if (audioRef.current) {
        const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration]
  );

  const skipBackward = useCallback((seconds = DEFAULT_SKIP_SECONDS) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    localStorage.setItem(PLAYBACK_RATE_KEY, rate.toString());
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsExpanded(false);
  }, []);

  const value = useMemo(
    (): AudioPlayerContextValue => ({
      currentTrack,
      isPlaying,
      isLoading,
      currentTime,
      duration,
      playbackRate,
      isExpanded,
      play,
      pause,
      togglePlayPause,
      seek,
      skipForward,
      skipBackward,
      setPlaybackRate,
      expand,
      collapse,
      stop,
    }),
    [
      currentTrack,
      isPlaying,
      isLoading,
      currentTime,
      duration,
      playbackRate,
      isExpanded,
      play,
      pause,
      togglePlayPause,
      seek,
      skipForward,
      skipBackward,
      setPlaybackRate,
      expand,
      collapse,
      stop,
    ]
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayerContext() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayerContext must be used within an AudioPlayerProvider");
  }
  return context;
}
