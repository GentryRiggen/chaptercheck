import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";

export interface TrackInfo {
  audioFileId: Id<"audioFiles">;
  displayName: string;
  bookId: Id<"books">;
  bookTitle: string;
  coverImageR2Key?: string;
  seriesName?: string;
  seriesOrder?: number;
  partNumber?: number;
  totalParts: number;
}

export interface PlayOptions {
  initialPosition?: number;
  initialPlaybackRate?: number;
}

export interface AudioPlayerContextValue {
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
  play: (track: TrackInfo, options?: PlayOptions) => Promise<void>;
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
