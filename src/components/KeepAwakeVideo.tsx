import {useEffect, useRef} from 'react';
import {AudioPlayer as W3CAudioPlayer} from '@amazon-devices/react-native-w3cmedia';

// Silent looping audio. Audio-playback is one of the session types Vega's resource
// manager keeps the display awake for — and audio decode is far lighter than video,
// so it dodges the memory/power pressure that made video decode fail on this stick.
const SRC = 'https://computerscienceiscool.github.io/k-time-weather-date/awake-audio.m4a';

const RETRY_MS = 4000;

/**
 * Plays a silent audio loop to keep the screen awake. Renders nothing.
 */
export const KeepAwakeVideo = () => {
  const playerRef = useRef<W3CAudioPlayer | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    const teardown = (p: W3CAudioPlayer | null) => {
      if (!p) {
        return;
      }
      try {
        p.pause();
      } catch (e) {}
      try {
        p.deinitialize();
      } catch (e) {}
    };

    const scheduleRetry = () => {
      if (!aliveRef.current) {
        return;
      }
      if (retryRef.current) {
        clearTimeout(retryRef.current);
      }
      retryRef.current = setTimeout(start, RETRY_MS);
    };

    const start = () => {
      if (!aliveRef.current) {
        return;
      }
      teardown(playerRef.current);
      const p = new W3CAudioPlayer();
      playerRef.current = p;

      p.addEventListener('loadedmetadata', () => {
        try {
          p.play();
        } catch (e) {}
      });
      p.addEventListener('playing', () => console.info('[keepawake] AUDIO PLAYING'));
      p.addEventListener('ended', () => {
        try {
          p.currentTime = 0;
          p.play();
        } catch (e) {}
      });
      p.addEventListener('error', (e: any) => {
        console.error('[keepawake] audio error code=', e?.target?.error?.code, '— retrying');
        scheduleRetry();
      });

      p.initialize()
        .then(() => {
          if (!aliveRef.current) {
            teardown(p);
            return;
          }
          try {
            (p as any).loop = true;
          } catch (e) {}
          p.autoplay = true;
          p.src = SRC;
          p.load();
        })
        .catch(() => scheduleRetry());
    };

    start();

    return () => {
      aliveRef.current = false;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
      }
      teardown(playerRef.current);
    };
  }, []);

  return null;
};
