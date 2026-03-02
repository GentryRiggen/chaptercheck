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
const SAVE_INTERVAL_MS = 10_000;
const MIN_POSITION_CHANGE = 1; // seconds

// Skip momentum: rapid consecutive taps escalate the skip amount
const SKIP_TIERS = [15, 30, 60, 120]; // seconds
const FORWARD_BASE_TIER = 1; // forward starts at 30s to match iOS convention
const SKIP_MOMENTUM_TAPS = 4; // consecutive rapid taps before escalating
const SKIP_MOMENTUM_WINDOW = 800; // ms — max gap between taps to count as rapid
const SKIP_RESET_DELAY = 1500; // ms — UI resets after inactivity

interface SkipDirectionState {
  count: number;
  lastTime: number;
  tierIndex: number;
}

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
  const [lastSavedAt, setLastSavedAt] = useState(0);

  // Skip momentum state
  const [skipAmountForward, setSkipAmountForward] = useState(SKIP_TIERS[FORWARD_BASE_TIER]);
  const [skipAmountBackward, setSkipAmountBackward] = useState(SKIP_TIERS[0]);
  const skipMomentumRef = useRef<{
    forward: SkipDirectionState;
    backward: SkipDirectionState;
  }>({
    forward: { count: 0, lastTime: 0, tierIndex: FORWARD_BASE_TIER },
    backward: { count: 0, lastTime: 0, tierIndex: 0 },
  });
  const skipResetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // Clean up skip momentum reset timer on unmount
  useEffect(() => {
    return () => clearTimeout(skipResetTimerRef.current);
  }, []);

  // Save progress to server (throttled — skips if position hasn't changed enough)
  const saveProgress = useCallback(() => {
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!track || !audio) return;

    const position = audio.currentTime;
    if (Math.abs(position - lastSavedPositionRef.current) < MIN_POSITION_CHANGE) return;

    lastSavedPositionRef.current = position;
    setLastSavedAt(Date.now());
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

  // Compute momentum-adjusted skip amount for a direction
  const getSkipAmount = useCallback((direction: "forward" | "backward"): number => {
    const now = Date.now();
    const state = skipMomentumRef.current[direction];

    if (now - state.lastTime < SKIP_MOMENTUM_WINDOW) {
      state.count++;
      if (state.count >= SKIP_MOMENTUM_TAPS && state.tierIndex < SKIP_TIERS.length - 1) {
        state.tierIndex++;
        state.count = 0;
      }
    } else {
      state.count = 1;
      state.tierIndex = direction === "forward" ? FORWARD_BASE_TIER : 0;
    }
    state.lastTime = now;

    const amount = SKIP_TIERS[state.tierIndex];
    if (direction === "forward") setSkipAmountForward(amount);
    else setSkipAmountBackward(amount);

    // Reset UI after inactivity
    clearTimeout(skipResetTimerRef.current);
    skipResetTimerRef.current = setTimeout(() => {
      skipMomentumRef.current.forward = { count: 0, lastTime: 0, tierIndex: FORWARD_BASE_TIER };
      skipMomentumRef.current.backward = { count: 0, lastTime: 0, tierIndex: 0 };
      setSkipAmountForward(SKIP_TIERS[FORWARD_BASE_TIER]);
      setSkipAmountBackward(SKIP_TIERS[0]);
    }, SKIP_RESET_DELAY);

    return amount;
  }, []);

  const resetMomentum = useCallback(() => {
    skipMomentumRef.current.forward = { count: 0, lastTime: 0, tierIndex: FORWARD_BASE_TIER };
    skipMomentumRef.current.backward = { count: 0, lastTime: 0, tierIndex: 0 };
    setSkipAmountForward(SKIP_TIERS[FORWARD_BASE_TIER]);
    setSkipAmountBackward(SKIP_TIERS[0]);
    clearTimeout(skipResetTimerRef.current);
  }, []);

  const skipForward = useCallback(
    (seconds?: number) => {
      if (audioRef.current) {
        const amount = seconds ?? getSkipAmount("forward");
        const newTime = Math.min(audioRef.current.currentTime + amount, duration);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration, getSkipAmount]
  );

  const skipBackward = useCallback(
    (seconds?: number) => {
      if (audioRef.current) {
        const amount = seconds ?? getSkipAmount("backward");
        const newTime = Math.max(audioRef.current.currentTime - amount, 0);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [getSkipAmount]
  );

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
      resetMomentum();
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
    [currentTrack?.audioFileId, generateStreamUrl, resetMomentum, saveProgress]
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
    resetMomentum();

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
  }, [resetMomentum, saveProgress]);

  const value = useMemo(
    (): AudioPlayerContextValue => ({
      currentTrack,
      isPlaying,
      isLoading,
      currentTime,
      duration,
      playbackRate,
      isExpanded,
      lastSavedAt,
      skipAmountForward,
      skipAmountBackward,
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
      lastSavedAt,
      skipAmountForward,
      skipAmountBackward,
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
