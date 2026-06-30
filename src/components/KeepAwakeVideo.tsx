import {useCallback, useEffect, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {
  IKeplerAppStateManager,
  useKeplerAppStateManager,
} from '@amazon-devices/react-native-kepler';
import {
  KeplerVideoSurfaceView,
  VideoPlayer as W3CVideoPlayer,
  KeplerMediaControlHandler,
} from '@amazon-devices/react-native-w3cmedia';

// Video-ONLY (no audio track) black clip. Looping it registers a video-playback
// session so Vega keeps the display awake. No audio track => the device's audio
// output (which reports "Function not implemented" here) is never touched. The clip
// is pure black, so a full-screen surface is invisible. A media session
// (setMediaControlFocus) is registered or the framework reclaims the decoder.
const SRC = 'https://computerscienceiscool.github.io/k-time-weather-date/awake-vid.mp4';

/**
 * Keeps the screen awake by looping a silent, video-only black clip with a
 * registered media session. Retries cleanly (awaits deinitialize, never stacks).
 */
export const KeepAwakeVideo = () => {
  const appState: IKeplerAppStateManager = useKeplerAppStateManager();
  const playerRef = useRef<W3CVideoPlayer | null>(null);
  const handleRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const aliveRef = useRef(true);
  const restartingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryPlay = useCallback(() => {
    const p = playerRef.current;
    if (p && readyRef.current && handleRef.current) {
      try {
        p.setSurfaceHandle(handleRef.current);
        p.play();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    let attempt = 0;

    const teardown = async (p: W3CVideoPlayer | null) => {
      if (!p) {
        return;
      }
      try {
        p.pause();
      } catch (e) {}
      try {
        await p.deinitialize();
      } catch (e) {}
    };

    const scheduleRestart = () => {
      if (!aliveRef.current || restartingRef.current) {
        return;
      }
      restartingRef.current = true;
      const delay = Math.min(2000 + attempt * 1500, 12000);
      timerRef.current = setTimeout(async () => {
        await teardown(playerRef.current);
        playerRef.current = null;
        readyRef.current = false;
        restartingRef.current = false;
        if (aliveRef.current) {
          start();
        }
      }, delay);
    };

    const start = async () => {
      if (!aliveRef.current || playerRef.current) {
        return;
      }
      attempt++;
      readyRef.current = false;
      const p = new W3CVideoPlayer();
      playerRef.current = p;
      let handled = false;
      const onFail = (why: string) => {
        if (handled) {
          return;
        }
        handled = true;
        console.error('[keepawake] ' + why + ' — restarting');
        scheduleRestart();
      };

      p.addEventListener('loadedmetadata', () => {
        readyRef.current = true;
        tryPlay();
      });
      p.addEventListener('playing', () => {
        attempt = 0;
        console.info('[keepawake] VIDEO PLAYING');
      });
      p.addEventListener('ended', () => {
        try {
          p.currentTime = 0;
          p.play();
        } catch (e) {}
      });
      p.addEventListener('error', (e: any) =>
        onFail('error code=' + (e?.target?.error?.code)),
      );

      try {
        await p.initialize();
        if (!aliveRef.current) {
          await teardown(p);
          return;
        }
        try {
          const ci = appState.getComponentInstance();
          if (ci) {
            await p.setMediaControlFocus(ci, new KeplerMediaControlHandler());
          }
        } catch (e) {
          console.error('[keepawake] setMediaControlFocus failed', e);
        }
        try {
          (p as any).loop = true;
        } catch (e) {}
        p.autoplay = true;
        p.src = SRC;
        p.load();
      } catch (e) {
        onFail('init failed');
      }
    };

    start();
    return () => {
      aliveRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      teardown(playerRef.current);
    };
  }, [appState, tryPlay]);

  const onSurfaceCreated = useCallback(
    (handle: string) => {
      handleRef.current = handle;
      tryPlay();
    },
    [tryPlay],
  );

  const onSurfaceDestroyed = useCallback((handle: string) => {
    try {
      playerRef.current?.clearSurfaceHandle(handle);
    } catch (e) {}
    handleRef.current = null;
  }, []);

  return (
    <KeplerVideoSurfaceView
      style={StyleSheet.absoluteFill}
      onSurfaceViewCreated={onSurfaceCreated}
      onSurfaceViewDestroyed={onSurfaceDestroyed}
      testID="keepawake-surface"
    />
  );
};
