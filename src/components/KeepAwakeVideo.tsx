import React, {useCallback, useEffect, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {
  KeplerVideoSurfaceView,
  VideoPlayer as W3CVideoPlayer,
} from '@amazon-devices/react-native-w3cmedia';

// HYPOTHESIS TEST: a known-good remote mp4. If this keeps the screen awake,
// we'll swap to a tiny silent black clip (hosted, since file:// isn't supported).
const SRC = 'https://giolaq.github.io/scrap-tv-feed/content/aliens-from-vega/vega.mp4';

/**
 * Loops a muted video to register an active video-playback session, so Vega's
 * resource manager keeps the display awake (prevents the system screensaver).
 * Playback only starts once BOTH the surface and the media metadata are ready.
 */
export const KeepAwakeVideo = () => {
  const playerRef = useRef<W3CVideoPlayer | null>(null);
  const handleRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const tryPlay = useCallback(() => {
    const p = playerRef.current;
    if (p && readyRef.current && handleRef.current) {
      try {
        p.setSurfaceHandle(handleRef.current);
        p.play();
        console.info('[keepawake] play() — surface + media both ready');
      } catch (e) {
        console.error('[keepawake] play error:', e);
      }
    }
  }, []);

  useEffect(() => {
    const p = new W3CVideoPlayer();
    playerRef.current = p;

    const onMeta = () => {
      readyRef.current = true;
      console.info('[keepawake] loadedmetadata; duration=', p.duration);
      tryPlay();
    };
    const onEnded = () => {
      try {
        p.currentTime = 0;
        p.play();
      } catch (e) {}
    };
    const onErr = (e: any) => {
      const code = e?.target?.error?.code;
      const msg =
        e?.target?.mediaControlStateUtil?.mError?.message_ ||
        e?.target?.error?.message;
      console.error('[keepawake] error code=', code, 'msg=', msg);
    };
    const onPlaying = () => console.info('[keepawake] PLAYING event');

    p.initialize()
      .then(() => {
        try {
          (p as any).loop = true;
        } catch (e) {}
        try {
          (p as any).muted = true;
        } catch (e) {}
        p.autoplay = true;
        p.addEventListener('loadedmetadata', onMeta);
        p.addEventListener('playing', onPlaying);
        p.addEventListener('ended', onEnded);
        p.addEventListener('error', onErr);
        p.src = SRC;
        p.load();
        console.info('[keepawake] init done, src set + load()');
      })
      .catch((e) => console.error('[keepawake] init failed:', e));

    return () => {
      try {
        p.pause();
        p.deinitialize();
      } catch (e) {}
    };
  }, [tryPlay]);

  const onSurfaceCreated = useCallback(
    (handle: string) => {
      handleRef.current = handle;
      console.info('[keepawake] surface created');
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
