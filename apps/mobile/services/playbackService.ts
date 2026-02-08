import TrackPlayer, { Event } from "react-native-track-player";

const DEFAULT_JUMP_SECONDS = 15;

/**
 * Background playback service registered with react-native-track-player.
 * Handles remote control events from lock screen / notification center.
 */
export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async () => {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(position + DEFAULT_JUMP_SECONDS);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async () => {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, position - DEFAULT_JUMP_SECONDS));
  });
}
