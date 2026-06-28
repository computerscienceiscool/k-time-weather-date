# k-time-weather-date

A full-screen ambient **clock / date / weather** app for **Amazon Fire TV (Vega OS)** — built with React Native for Vega (Kepler).

It shows a large drifting clock over a starfield, with the current date and live local weather. The clock "bounces" around the screen (DVD-logo style) to avoid OLED/QLED burn-in, and it **stays on indefinitely** until you exit — see "Keeping the screen awake" below.

![platform](https://img.shields.io/badge/platform-Vega%20OS%20(Fire%20TV)-blue)

## Features

- **Big clock + date**, updated every second.
- **Live weather** via [Open-Meteo](https://open-meteo.com) (free, no API key), with location auto-detected by IP ([ipwho.is](https://ipwho.is)).
- **Starfield** background (200 stars).
- **Edge-to-edge bounce** of the clock cluster (constant-velocity, screen-roaming) to prevent burn-in.
- **Stay-awake**: keeps the system screensaver from covering the app (see below).

## Build & run (Vega SDK required)

```bash
npm install
npm run build:release          # -> build/armv7-release/hellovega_armv7.vpkg

# with a Fire TV Stick 4K Select in developer mode, connected by USB-C:
vega device install-app --packagePath build/armv7-release/hellovega_armv7.vpkg
vega device launch-app --appName com.thesalleys.hellovega.main
```

For the emulator, build `build:debug` and use the `x86_64` vpkg with `vega run-app`
(note: on a Wayland host the virtual device must be started with `--no-gl-accel`).

## Keeping the screen awake (the interesting part)

Vega OS provides **no public API** for a non-media app to prevent the system
screensaver — confirmed by Amazon staff. After ~5 minutes idle, the screensaver
covers any foreground app.

Workaround used here: the resource manager **does** keep the display awake for an
**active video-playback session**. So `src/components/KeepAwakeVideo.tsx` plays a
tiny silent looping video (hosted on this repo's GitHub Pages, since the W3C media
player rejects `file://` local assets). With it playing, the clock stays up
indefinitely. Verified on a Fire TV Stick 4K Select: 8+ minutes idle, no screensaver.

The clip is served from `docs/keepawake.mp4` via GitHub Pages.

## Tech

- React Native for Vega / `@amazon-devices/react-native-kepler`
- `@amazon-devices/react-native-w3cmedia` (W3C media player) for the keep-awake video
- Open-Meteo (weather) + ipwho.is (geolocation)

## License

MIT
