import { api } from "@chaptercheck/convex-backend/_generated/api";
import type {
  AudioPlayerContextValue,
  PlayOptions,
  TrackInfo,
} from "@chaptercheck/shared/types/audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { AppState } from "react-native";
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
} from "react-native-track-player";

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const PLAYBACK_RATE_KEY = "chaptercheck-playback-rate";
const DEFAULT_SKIP_SECONDS = 15;
const SAVE_INTERVAL_MS = 10_000;
const MIN_POSITION_CHANGE = 1; // seconds

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);
  const saveProgressMutation = useMutation(api.listeningProgress.mutations.saveProgress);

  // Keep a ref to the current track so the play callback can read it
  // without a stale closure
  const currentTrackRef = useRef<TrackInfo | null>(null);
  currentTrackRef.current = currentTrack;

  // Keep a ref to the playback rate for use inside async callbacks
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const lastSavedPositionRef = useRef(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Initialize TrackPlayer on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await TrackPlayer.setupPlayer();
      } catch {
        // setupPlayer throws if already initialized -- that is fine
      }

      if (cancelled) return;

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SeekTo,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        forwardJumpInterval: DEFAULT_SKIP_SECONDS,
        backwardJumpInterval: DEFAULT_SKIP_SECONDS,
      });

      setIsPlayerReady(true);
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Restore persisted playback rate
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadRate() {
      try {
        const stored = await AsyncStorage.getItem(PLAYBACK_RATE_KEY);
        if (stored) {
          const rate = parseFloat(stored);
          if (!isNaN(rate) && rate >= 0.5 && rate <= 3) {
            setPlaybackRateState(rate);
          }
        }
      } catch {
        // AsyncStorage read failure is non-critical -- keep the default rate
      }
    }

    loadRate();
  }, []);

  // ---------------------------------------------------------------------------
  // react-native-track-player hooks for reactive state
  // ---------------------------------------------------------------------------
  const { position, duration } = useProgress();
  const playbackState = usePlaybackState();

  const playerState = playbackState.state;
  const isPlaying = playerState === State.Playing;
  const isBuffering = playerState === State.Buffering || playerState === State.Loading;

  // ---------------------------------------------------------------------------
  // Progress saving
  // ---------------------------------------------------------------------------
  const saveProgress = useCallback(async () => {
    const track = currentTrackRef.current;
    if (!track) return;

    try {
      const pos = await TrackPlayer.getPosition();
      if (Math.abs(pos - lastSavedPositionRef.current) < MIN_POSITION_CHANGE) return;

      lastSavedPositionRef.current = pos;
      await saveProgressMutation({
        bookId: track.bookId,
        audioFileId: track.audioFileId,
        positionSeconds: pos,
        playbackRate: playbackRateRef.current,
      });
    } catch (err) {
      if (__DEV__) console.warn("Failed to save progress:", err);
    }
  }, [saveProgressMutation]);

  // Periodic save interval — starts when playing, clears when paused/stopped
  useEffect(() => {
    if (isPlaying) {
      saveIntervalRef.current = setInterval(() => {
        saveProgress();
      }, SAVE_INTERVAL_MS);
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

  // Save when app goes to background/inactive (replaces web's beforeunload)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        saveProgress();
      }
    });

    return () => subscription.remove();
  }, [saveProgress]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------
  const play = useCallback(
    async (track: TrackInfo, options?: PlayOptions) => {
      // If the same track is already loaded, just resume
      if (currentTrackRef.current?.audioFileId === track.audioFileId && isPlayerReady) {
        await TrackPlayer.play();
        return;
      }

      // Save progress for the track we're leaving
      await saveProgress();

      setIsLoading(true);
      setCurrentTrack(track);
      lastSavedPositionRef.current = 0;

      try {
        const { streamUrl } = await generateStreamUrl({
          audioFileId: track.audioFileId,
        });

        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.audioFileId,
          url: streamUrl,
          title: track.displayName,
          artist: track.bookTitle,
          artwork: undefined,
        });

        // Apply per-book playback rate if provided, otherwise use current rate
        if (options?.initialPlaybackRate) {
          setPlaybackRateState(options.initialPlaybackRate);
          await TrackPlayer.setRate(options.initialPlaybackRate);
        } else {
          await TrackPlayer.setRate(playbackRateRef.current);
        }

        await TrackPlayer.play();

        // Seek to saved position after starting playback
        if (options?.initialPosition && options.initialPosition > 0) {
          await TrackPlayer.seekTo(options.initialPosition);
        }
      } catch (err) {
        console.error("Failed to load audio:", err);
        setCurrentTrack(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isPlayerReady, generateStreamUrl, saveProgress]
  );

  const pause = useCallback(async () => {
    if (!isPlayerReady) return;
    await TrackPlayer.pause();
    // Save on pause
    await saveProgress();
  }, [isPlayerReady, saveProgress]);

  const togglePlayPause = useCallback(async () => {
    if (!isPlayerReady) return;
    if (isPlaying) {
      await TrackPlayer.pause();
      await saveProgress();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlayerReady, isPlaying, saveProgress]);

  const seek = useCallback(
    async (time: number) => {
      if (!isPlayerReady) return;
      await TrackPlayer.seekTo(time);
    },
    [isPlayerReady]
  );

  const skipForward = useCallback(
    async (seconds = DEFAULT_SKIP_SECONDS) => {
      if (!isPlayerReady) return;
      const current = await TrackPlayer.getPosition();
      const trackDuration = await TrackPlayer.getDuration();
      await TrackPlayer.seekTo(Math.min(current + seconds, trackDuration));
    },
    [isPlayerReady]
  );

  const skipBackward = useCallback(
    async (seconds = DEFAULT_SKIP_SECONDS) => {
      if (!isPlayerReady) return;
      const current = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(current - seconds, 0));
    },
    [isPlayerReady]
  );

  const setPlaybackRate = useCallback(
    async (rate: number) => {
      setPlaybackRateState(rate);

      // Persist to storage (fire-and-forget)
      AsyncStorage.setItem(PLAYBACK_RATE_KEY, rate.toString()).catch(() => {
        // Non-critical write failure -- the rate is already set in state
      });

      if (isPlayerReady) {
        await TrackPlayer.setRate(rate);
      }

      // Save rate change to server immediately
      await saveProgress();
    },
    [isPlayerReady, saveProgress]
  );

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  const stop = useCallback(async () => {
    // Save before clearing state
    await saveProgress();

    if (isPlayerReady) {
      await TrackPlayer.reset();
    }
    setCurrentTrack(null);
    setIsExpanded(false);
  }, [isPlayerReady, saveProgress]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value = useMemo(
    (): AudioPlayerContextValue => ({
      currentTrack,
      isPlaying,
      isLoading: isLoading || isBuffering,
      currentTime: position,
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
      isBuffering,
      position,
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

export function useAudioPlayerContext(): AudioPlayerContextValue {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayerContext must be used within an AudioPlayerProvider");
  }
  return context;
}
