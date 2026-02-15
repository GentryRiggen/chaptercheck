"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import {
  type AudioPlayerContextValue,
  type PlayOptions,
  type TrackInfo,
} from "@chaptercheck/shared/types/audio";
import { useAction, useMutation } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const PLAYBACK_RATE_KEY = "chaptercheck-playback-rate";
const PROGRESS_FALLBACK_KEY = "chaptercheck-progress-fallback";
const DEFAULT_SKIP_SECONDS = 15;
const SAVE_INTERVAL_MS = 10_000;
const MIN_POSITION_CHANGE = 1; // seconds

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
  const saveProgressMutation = useMutation(api.listeningProgress.mutations.saveProgress);

  // Refs for values needed in callbacks/intervals without causing re-renders
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const lastSavedPositionRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load fallback playback rate from localStorage on mount (one-time default)
  useEffect(() => {
    const stored = localStorage.getItem(PLAYBACK_RATE_KEY);
    if (stored) {
      const rate = parseFloat(stored);
      if (!isNaN(rate) && rate >= 0.5 && rate <= 3) {
        setPlaybackRateState(rate);
      }
    }

    // Check for unflushed progress from beforeunload
    const fallback = localStorage.getItem(PROGRESS_FALLBACK_KEY);
    if (fallback) {
      try {
        const data = JSON.parse(fallback) as {
          bookId: string;
          audioFileId: string;
          positionSeconds: number;
          playbackRate: number;
          savedAt: number;
        };
        // Only flush if less than 5 minutes old
        if (Date.now() - data.savedAt < 5 * 60 * 1000) {
          saveProgressMutation({
            bookId: data.bookId as Id<"books">,
            audioFileId: data.audioFileId as Id<"audioFiles">,
            positionSeconds: data.positionSeconds,
            playbackRate: data.playbackRate,
          }).catch(() => {
            // Silently fail — best-effort flush
          });
        }
      } catch {
        // Invalid JSON, ignore
      }
      localStorage.removeItem(PROGRESS_FALLBACK_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save progress to server (throttled — skips if position hasn't changed enough)
  const saveProgress = useCallback(() => {
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!track || !audio) return;

    const position = audio.currentTime;
    if (Math.abs(position - lastSavedPositionRef.current) < MIN_POSITION_CHANGE) return;

    lastSavedPositionRef.current = position;
    saveProgressMutation({
      bookId: track.bookId,
      audioFileId: track.audioFileId,
      positionSeconds: position,
      playbackRate: playbackRateRef.current,
    }).catch(() => {
      // Silently fail — will retry on next interval
    });
  }, [saveProgressMutation]);

  // Periodic save interval — starts when playing, clears when paused/stopped
  useEffect(() => {
    if (isPlaying) {
      saveIntervalRef.current = setInterval(saveProgress, SAVE_INTERVAL_MS);
    } else {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    }
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [isPlaying, saveProgress]);

  // beforeunload — write to localStorage as fallback
  useEffect(() => {
    const handleBeforeUnload = () => {
      const track = currentTrackRef.current;
      const audio = audioRef.current;
      if (!track || !audio) return;

      localStorage.setItem(
        PROGRESS_FALLBACK_KEY,
        JSON.stringify({
          bookId: track.bookId,
          audioFileId: track.audioFileId,
          positionSeconds: audio.currentTime,
          playbackRate: playbackRateRef.current,
          savedAt: Date.now(),
        })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Create and manage audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRateRef.current;
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => {
      setIsPlaying(false);
      // Save on pause
      saveProgress();
    };
    const handlePlay = () => setIsPlaying(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      // Seek to pending position if set
      if (pendingSeekRef.current !== null) {
        audio.currentTime = pendingSeekRef.current;
        setCurrentTime(pendingSeekRef.current);
        pendingSeekRef.current = null;
      }
    };
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
  }, [audioUrl, saveProgress]);

  // Update playback rate on audio element when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const play = useCallback(
    async (track: TrackInfo, options?: PlayOptions) => {
      // If same track, just resume
      if (currentTrack?.audioFileId === track.audioFileId && audioRef.current) {
        audioRef.current.play();
        return;
      }

      // Save progress for the track we're leaving
      saveProgress();

      // Load new track
      setIsLoading(true);
      setCurrentTrack(track);
      setCurrentTime(options?.initialPosition ?? 0);
      setDuration(0);
      lastSavedPositionRef.current = 0;

      // Set pending seek if resuming from a position
      if (options?.initialPosition && options.initialPosition > 0) {
        pendingSeekRef.current = options.initialPosition;
      }

      // Apply per-book playback rate if provided
      if (options?.initialPlaybackRate) {
        setPlaybackRateState(options.initialPlaybackRate);
      }

      try {
        const { streamUrl } = await generateStreamUrl({
          audioFileId: track.audioFileId,
        });
        setAudioUrl(streamUrl);
      } catch (err) {
        console.error("Failed to load audio:", err);
        setIsLoading(false);
      }
    },
    [currentTrack?.audioFileId, generateStreamUrl, saveProgress]
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

  const setPlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRateState(rate);
      localStorage.setItem(PLAYBACK_RATE_KEY, rate.toString());
      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
      }
      // Save rate change to server immediately
      saveProgress();
    },
    [saveProgress]
  );

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  const stop = useCallback(() => {
    // Save before clearing state
    saveProgress();

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
  }, [saveProgress]);

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
